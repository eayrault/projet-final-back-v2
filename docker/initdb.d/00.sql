DROP TABLE IF EXISTS event_registrations CASCADE;
DROP TABLE IF EXISTS matches CASCADE;
DROP TABLE IF EXISTS tournaments CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS games CASCADE;
DROP TABLE IF EXISTS refresh_tokens CASCADE;
DROP TABLE IF EXISTS user_auth CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;

CREATE TYPE user_role AS ENUM ('user', 'organizer', 'admin');

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  role user_role DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS user_auth (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS games (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    attendees INTEGER DEFAULT 0,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS tournaments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    attendees INTEGER DEFAULT 0,
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    score TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS event_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE(user_id, event_id)
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_users_auth_email ON user_auth(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_games_name ON games(name);
CREATE INDEX IF NOT EXISTS idx_events_start_date ON events(start_date);
CREATE INDEX IF NOT EXISTS idx_tournaments_event_id ON tournaments(event_id);
CREATE INDEX IF NOT EXISTS idx_tournaments_game_id ON tournaments(game_id);
CREATE INDEX IF NOT EXISTS idx_tournaments_start_date ON tournaments(start_date);
CREATE INDEX IF NOT EXISTS idx_matches_tournament_id ON matches(tournament_id);
CREATE INDEX IF NOT EXISTS idx_event_registrations_user_id ON event_registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_event_registrations_event_id ON event_registrations(event_id);


CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_games_updated_at 
    BEFORE UPDATE ON games 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at 
    BEFORE UPDATE ON events 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tournaments_updated_at 
    BEFORE UPDATE ON tournaments 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_matches_updated_at 
    BEFORE UPDATE ON matches 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

INSERT INTO users (username, first_name, last_name, role) 
VALUES (
    'admin', 
    'Admin', 
    'User',
    'admin'
) ON CONFLICT (username) DO NOTHING;

INSERT INTO user_auth (user_id, email, password_hash)
SELECT u.id, 'admin@test.com', '$argon2id$v=19$m=65536,t=3,p=4$JovYBPB4QaaiZPiR6fYUSg$ma1p4q7/J3/cpBkF/o20OToSEihpq6Dl4SAztTJ6Uy4'
FROM users u 
WHERE u.username = 'admin'
ON CONFLICT (email) DO NOTHING;

INSERT INTO games (name, description) VALUES 
    ('Guilty Gear -Strive-', 'Jeu de combat par Arc System Works'),
    ('Teamfight Tactics', 'Auto-battler par Riot Games'),
    ('Counter-Strike 2', 'FPS par Valve'),
    ('Super Smash Bros. Ultimate', 'Jeu de combat par Nintendo')  
ON CONFLICT (name) DO NOTHING;

INSERT INTO events (name, description, attendees, start_date, end_date) VALUES 
    ('Evo France 2026', 'Événement en France organisé par EVO', 0, '2026-01-01 09:00:00+00', '2026-02-01 21:00:00+00')
ON CONFLICT DO NOTHING;

INSERT INTO tournaments (name, description, attendees, game_id, event_id, start_date, end_date) VALUES 
    ('Tournoi Guilty Gear -Strive-', 'Tournoi de Guilty Gear -Strive- lors de l Evo France 2026', 0, (SELECT id FROM games WHERE name = 'Guilty Gear -Strive-'), (SELECT id FROM events WHERE name = 'Evo France 2026'), '2026-01-01 10:00:00+00', '2026-02-01 20:00:00+00')
ON CONFLICT DO NOTHING;

SELECT 'Tables created' as message;