-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create verticals table
CREATE TABLE IF NOT EXISTS verticals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create sheets table
CREATE TABLE IF NOT EXISTS sheets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vertical_id UUID NOT NULL REFERENCES verticals(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT NOT NULL,
  columns JSONB NOT NULL DEFAULT '[]'::jsonb,
  agents JSONB NOT NULL DEFAULT '[]'::jsonb,
  http_requests JSONB NOT NULL DEFAULT '[]'::jsonb,
  auto_update BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create rows table
CREATE TABLE IF NOT EXISTS rows (
  id TEXT PRIMARY KEY,
  sheet_id UUID NOT NULL REFERENCES sheets(id) ON DELETE CASCADE,
  data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sheets_vertical_id ON sheets(vertical_id);
CREATE INDEX IF NOT EXISTS idx_rows_sheet_id ON rows(sheet_id);

-- Enable Row Level Security (initially allowing all operations)
-- You can restrict this later when adding authentication
ALTER TABLE verticals ENABLE ROW LEVEL SECURITY;
ALTER TABLE sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE rows ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all operations (for now, without auth)
CREATE POLICY "Allow all operations on verticals" ON verticals
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on sheets" ON sheets
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on rows" ON rows
  FOR ALL USING (true) WITH CHECK (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_verticals_updated_at
  BEFORE UPDATE ON verticals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sheets_updated_at
  BEFORE UPDATE ON sheets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rows_updated_at
  BEFORE UPDATE ON rows
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create app_settings table (stores API keys and preferences)
CREATE TABLE IF NOT EXISTS app_settings (
  id TEXT PRIMARY KEY DEFAULT 'global',
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on app_settings" ON app_settings
  FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER update_app_settings_updated_at
  BEFORE UPDATE ON app_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
