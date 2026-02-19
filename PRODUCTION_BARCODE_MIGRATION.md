# Production Barcode Migration Guide

## Current Situation
- ✅ Local database: Has new 10-character barcodes
- ❌ Production database: Still has old long barcodes

## Solution: Deploy & Migrate Production

### Step 1: Deploy Updated Code
```bash
# Commit your changes
git add .
git commit -m "Update barcode generation to 10-char name-based format"

# Push to production branch
git push origin prod
```

### Step 2: Open Production App
1. Open your production app URL in browser
2. Login with your admin account

### Step 3: Run Migration in Production
1. Go to **Inventory → View Products**
2. You'll see the orange "🔧 Barcode Migration Tool" at the top
3. Click **"Migrate All Products"** button
4. Wait for completion (you'll see logs like "✅ GATHIYA → GATHPU...")
5. Click **"🔄 Refresh Page"** button
6. All products now have 10-character barcodes!

### Step 4: Remove Migration Tool (Optional)
Once migration is complete in production, you can remove the migration tool:
- Edit `src/pages/Inventory/Inventory.tsx`
- Remove the line: `<MigrateBarcodes />`
- Commit and deploy

## Important Notes
- The migration only updates products that don't have 10-char barcodes
- Safe to run multiple times (won't duplicate work)
- All other product data remains unchanged
- Backward compatible (old products will still work during migration)

## Quick Deploy Commands
```bash
# Check current branch
git branch

# If not on prod branch
git checkout prod

# Add and commit changes
git add .
git commit -m "Update barcode system to 10-char format"

# Push to production
git push origin prod
```

After deploying, run the migration in production using the web UI!
