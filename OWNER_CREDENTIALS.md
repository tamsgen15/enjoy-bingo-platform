# Unified Auth System Credentials

## User Roles & Login Details

### Admin User
- **Username:** `admin`
- **Password:** `admin123`
- **Access:** `/admin` - Game management, player control

### Platform Owner
- **Username:** `owner`
- **Password:** `owner123`
- **Access:** `/owner/dashboard` - Revenue tracking, analytics

### Legacy Owner
- **Username:** `Enjoyowner@1501`
- **Password:** `Enjoy@1501`
- **Access:** `/owner/dashboard` - Full platform access

### Regular Players
- **Any username/password** - Game participation

## Features by Role
- **Admin:** Game controls, player management
- **Owner:** Revenue tracking, statistics, settings
- **Player:** Join games, play bingo

## Database Setup
Run: `supabase/create_owner_credentials.sql`