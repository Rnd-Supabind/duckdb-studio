-- Initialize databases for DataForge application
-- This script runs when the MySQL container starts

-- Create Temporal databases
CREATE DATABASE IF NOT EXISTS temporal;
CREATE DATABASE IF NOT EXISTS temporal_visibility;

-- Grant permissions to the application user
GRANT ALL PRIVILEGES ON temporal.* TO 'user'@'%';
GRANT ALL PRIVILEGES ON temporal_visibility.* TO 'user'@'%';

-- Ensure dataforge database exists and has proper permissions
GRANT ALL PRIVILEGES ON dataforge.* TO 'user'@'%';

FLUSH PRIVILEGES;
