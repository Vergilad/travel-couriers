-- Create profiles table
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    display_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    city TEXT,
    country TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_banned BOOLEAN DEFAULT FALSE
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are viewable by everyone." ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile." ON profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Create user_roles table
CREATE TABLE user_roles (
    user_id UUID REFERENCES auth.users(id),
    role TEXT CHECK (role IN (
        'admin',
        'user'
    )),
    PRIMARY KEY (user_id, role)
);
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
-- No public read access to user_roles, as this is for internal security logic

-- Function to check if a user has a specific role
CREATE FUNCTION has_role(user_id UUID, role TEXT) RETURNS BOOLEAN AS $$
    SELECT EXISTS(SELECT 1 FROM user_roles WHERE user_id = has_role.user_id AND role = has_role.role);
$$ LANGUAGE SQL SECURITY DEFINER;

-- Create listings table
CREATE TABLE listings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES auth.users(id),
    kind TEXT CHECK (kind IN (
        'trip',
        'request',
        'delivery'
    )),
    origin_city TEXT,
    origin_country TEXT,
    dest_city TEXT,
    dest_country TEXT,
    depart_date DATE,
    arrive_date DATE,
    title TEXT,
    description TEXT,
    price NUMERIC(10, 2),
    currency TEXT,
    capacity_kg NUMERIC(10, 2),
    status TEXT DEFAULT 'open' CHECK (status IN (
        'open',
        'matched',
        'completed',
        'cancelled'
    )),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public listings are viewable by everyone." ON listings FOR SELECT USING (status = 'open');
CREATE POLICY "Users can create their own listings." ON listings FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can update their own listings." ON listings FOR UPDATE USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can delete their own listings." ON listings FOR DELETE USING (auth.uid() = owner_id);

-- Create threads table
CREATE TABLE threads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id UUID REFERENCES listings(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE threads ENABLE ROW LEVEL SECURITY;
-- RLS for threads will be handled by thread_participants

-- Create thread_participants table
CREATE TABLE thread_participants (
    thread_id UUID REFERENCES threads(id),
    user_id UUID REFERENCES auth.users(id),
    PRIMARY KEY (thread_id, user_id)
);
ALTER TABLE thread_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants can view their own threads." ON thread_participants FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Participants can insert into their own threads." ON thread_participants FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create messages table
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    thread_id UUID REFERENCES threads(id),
    sender_id UUID REFERENCES auth.users(id),
    body TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_at TIMESTAMP WITH TIME ZONE
);
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants can view messages in their threads." ON messages FOR SELECT USING (EXISTS(SELECT 1 FROM thread_participants WHERE thread_id = messages.thread_id AND user_id = auth.uid()));
CREATE POLICY "Participants can send messages in their threads." ON messages FOR INSERT WITH CHECK (EXISTS(SELECT 1 FROM thread_participants WHERE thread_id = messages.thread_id AND user_id = auth.uid()) AND auth.uid() = sender_id);

-- Create match_confirmations table
CREATE TABLE match_confirmations (
    thread_id UUID REFERENCES threads(id),
    user_id UUID REFERENCES auth.users(id),
    confirmed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (thread_id, user_id)
);
ALTER TABLE match_confirmations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants can view match confirmations in their threads." ON match_confirmations FOR SELECT USING (EXISTS(SELECT 1 FROM thread_participants WHERE thread_id = match_confirmations.thread_id AND user_id = auth.uid()));
CREATE POLICY "Participants can confirm matches once." ON match_confirmations FOR INSERT WITH CHECK (EXISTS(SELECT 1 FROM thread_participants WHERE thread_id = match_confirmations.thread_id AND user_id = auth.uid()) AND auth.uid() = user_id);

-- Trigger to update listing status and create payment on match confirmation
CREATE OR REPLACE FUNCTION handle_match_confirmation() RETURNS TRIGGER AS $$
BEGIN
    IF (SELECT COUNT(*) FROM match_confirmations WHERE thread_id = NEW.thread_id) = 2 THEN
        UPDATE listings
        SET status = 'matched'
        WHERE id = (SELECT listing_id FROM threads WHERE id = NEW.thread_id);

        INSERT INTO payments (thread_id, listing_id, payer_id, payee_id, amount, currency, status)
        SELECT
            t.id, t.listing_id,
            CASE
                WHEN l.kind = 'trip' THEN (SELECT user_id FROM thread_participants WHERE thread_id = t.id AND user_id != l.owner_id)
                ELSE l.owner_id
            END AS payer_id,
            CASE
                WHEN l.kind = 'trip' THEN l.owner_id
                ELSE (SELECT user_id FROM thread_participants WHERE thread_id = t.id AND user_id != l.owner_id)
            END AS payee_id,
            l.price, l.currency, 'pending'
        FROM threads t
        JOIN listings l ON t.listing_id = l.id
        WHERE t.id = NEW.thread_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_match_confirmation_insert
AFTER INSERT ON match_confirmations
FOR EACH ROW EXECUTE FUNCTION handle_match_confirmation();

-- Create payments table
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    thread_id UUID REFERENCES threads(id),
    listing_id UUID REFERENCES listings(id),
    payer_id UUID REFERENCES auth.users(id),
    payee_id UUID REFERENCES auth.users(id),
    amount NUMERIC(10, 2),
    currency TEXT,
    stripe_payment_intent_id TEXT,
    stripe_session_id TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN (
        'pending',
        'processing',
        'completed',
        'refunded',
        'failed'
    )),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Payer and payee can view their payments." ON payments FOR SELECT USING (auth.uid() = payer_id OR auth.uid() = payee_id);

-- Create reviews table
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id UUID REFERENCES listings(id),
    reviewer_id UUID REFERENCES auth.users(id),
    reviewee_id UUID REFERENCES auth.users(id),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (listing_id, reviewer_id)
);
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reviews are publicly viewable." ON reviews FOR SELECT USING (true);
CREATE POLICY "Users can write reviews after payment completion." ON reviews FOR INSERT WITH CHECK (EXISTS(SELECT 1 FROM payments WHERE listing_id = reviews.listing_id AND (payer_id = auth.uid() OR payee_id = auth.uid()) AND status = 'completed') AND auth.uid() = reviewer_id);

-- Create reports table
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id UUID REFERENCES auth.users(id),
    target_user_id UUID REFERENCES auth.users(id),
    target_listing_id UUID REFERENCES listings(id),
    reason TEXT,
    details TEXT,
    status TEXT DEFAULT 'open' CHECK (status IN (
        'open',
        'reviewed',
        'dismissed'
    )),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reporter and admins can view their reports." ON reports FOR SELECT USING (auth.uid() = reporter_id OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Any authenticated user can submit a report." ON reports FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Create notification_log table
CREATE TABLE notification_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    kind TEXT,
    payload JSONB,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own notification logs." ON notification_log FOR SELECT USING (auth.uid() = user_id);
-- Only Edge Function (service role) can insert into notification_log

-- Grant USAGE on schemas and SELECT on tables for anon role
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- Set up PostgreSQL functions for uuid generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Optional: Add a function to get user's display name for notifications
CREATE OR REPLACE FUNCTION get_user_display_name(p_user_id UUID) RETURNS TEXT AS $$
    SELECT display_name FROM profiles WHERE id = p_user_id;
$$ LANGUAGE SQL SECURITY DEFINER;