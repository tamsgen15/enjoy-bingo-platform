# Multi-Tenant Bingo Platform Setup

## Overview
This platform allows multiple admins to rent the bingo system independently. Each tenant operates in complete isolation while sharing the same infrastructure.

## Database Setup

1. **Run the multi-tenant schema:**
   ```sql
   -- Execute the SQL in supabase/multi_tenant_schema.sql
   ```

2. **Key Tables:**
   - `platform_subscriptions` - Tenant management
   - `platform_revenue` - Platform owner revenue tracking
   - Added `tenant_id` to existing tables for isolation

## Access Points

### Platform Owner Dashboard
- **URL:** `/platform-owner`
- **Purpose:** Manage all tenants, subscriptions, and platform revenue
- **Features:**
  - Create new tenants
  - Activate/suspend subscriptions
  - View revenue from all tenants
  - Monitor tenant activities

### Tenant Dashboard
- **URL:** `/tenant`
- **Purpose:** Individual tenant management
- **Authentication:** Email-based (no password required)
- **Features:**
  - View subscription status
  - Create and manage games
  - Track tenant-specific revenue
  - Access admin controls

## Workflow

### 1. Tenant Creation (Platform Owner)
```javascript
// Platform owner creates tenant
const result = await platformService.createTenant(
  "Tenant Name",
  "admin@email.com", 
  "+251912345678",
  "Ethiopia"
)
```

### 2. Payment & Activation
- Tenant pays 20,000 ETB manually (outside app)
- Platform owner activates subscription
- Tenant receives 1-month access

### 3. Tenant Operations
- Tenant logs in with email
- Creates games with tenant isolation
- Manages players and revenue
- All data isolated by `tenant_id`

## Revenue Model

### Platform Owner Revenue
- **Source:** Monthly subscription fees
- **Amount:** 20,000 ETB per tenant per month
- **Payment:** Manual (outside app)

### Tenant Revenue
- **Source:** Game entry fees from players
- **Amount:** 20 ETB per player
- **Ownership:** 100% belongs to tenant

## Multi-Tenant Isolation

### Database Level
```sql
-- All queries filtered by tenant_id
SELECT * FROM games WHERE tenant_id = 'tenant-uuid';
SELECT * FROM players WHERE tenant_id = 'tenant-uuid';
```

### Application Level
```javascript
// Tenant-aware game creation
await tenantService.createTenantGame(tenantId, adminId)

// Tenant-aware number calling
await tenantService.callNextNumber(gameId, tenantId)
```

## URL Parameters

### Admin Page (Multi-tenant)
```
/admin?tenant=TENANT_ID&game=GAME_ID
```

### Game Page (Multi-tenant)
```
/game?tenant=TENANT_ID
/game/GAME_ID?tenant=TENANT_ID
```

## Subscription Management

### Status Types
- `pending` - Awaiting payment
- `active` - Subscription active
- `expired` - Subscription ended
- `suspended` - Manually suspended

### Automatic Expiration
- Subscriptions expire after 1 month
- Expired tenants cannot create games
- Data remains accessible (read-only)

## Security Features

### Tenant Isolation
- All database queries include `tenant_id` filter
- No cross-tenant data access
- Shared resources (bingo cards, rules) remain common

### Subscription Validation
- Every operation validates subscription status
- Expired subscriptions block game creation
- Real-time status checking

## API Functions

### Platform Service
```javascript
// Create tenant
platformService.createTenant(name, email, phone, country)

// Activate subscription
platformService.activateSubscription(tenantId, amount)

// Check status
platformService.checkTenantStatus(tenantId)

// Get revenue
platformService.getPlatformRevenue()
```

### Tenant Service
```javascript
// Create tenant game
tenantService.createTenantGame(tenantId, adminId)

// Get tenant games
tenantService.getTenantGames(tenantId)

// Call number (tenant-aware)
tenantService.callNextNumber(gameId, tenantId)
```

## Deployment Notes

### Environment Variables
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
```

### Database Functions
- All tenant functions are in `multi_tenant_schema.sql`
- Functions handle subscription validation
- Automatic expiration checking

## Usage Examples

### Platform Owner Creates Tenant
1. Go to `/platform-owner`
2. Click "Create New Tenant"
3. Fill tenant details
4. Tenant receives "pending" status

### Tenant Pays & Gets Activated
1. Tenant pays 20,000 ETB manually
2. Platform owner clicks "Activate" 
3. Tenant gets 1-month access
4. Tenant can now create games

### Tenant Manages Games
1. Go to `/tenant`
2. Login with registered email
3. Create games (if subscription active)
4. Access admin controls with tenant isolation

## Revenue Tracking

### Platform Owner View
- Total revenue from all tenants
- Monthly revenue breakdown
- Active tenant count
- Payment history

### Tenant View
- Games hosted count
- Total players served
- Revenue generated (entry fees)
- Subscription status and days remaining

This multi-tenant system allows unlimited tenants to rent the platform independently while maintaining complete data isolation and revenue separation.