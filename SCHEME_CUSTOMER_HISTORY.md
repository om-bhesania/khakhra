# Customer History - Scheme Products Summary

## New Feature Added: Products Purchased During Active Schemes

### What It Does:
Shows a **comprehensive list of ALL products** purchased by a customer during **ANY active scheme period**, regardless of whether the product is part of the scheme or not.

### Use Case:
When a customer visits, you can quickly see:
- All products they purchased during scheme periods
- Total quantity of each product
- Which schemes were active when they bought it
- Total amount spent on each product

### How It Works:

1. **Checks Active Schemes**
   - Only shows data for schemes that haven't expired yet
   
2. **Finds All Bills**
   - Looks at all customer bills that fall within any active scheme's date range
   
3. **Aggregates Products**
   - Collects ALL products from those bills (not just scheme-specific products)
   - Groups by product name
   - Sums up quantities and amounts
   - Tracks which schemes were active during purchase

### Display Format:

**Section Name:** "Products Purchased During Active Schemes"
**Color:** Blue background (to differentiate from green scheme-specific and amber manual packets)

**Table Columns:**
- Product Name
- Quantity (total across all scheme periods)
- Rate (price per unit)
- Total Amount
- Schemes (badges showing which schemes were active)

**Footer Row:**
- Total Quantity
- Total Amount

### Example Scenario:

**Active Schemes:**
- Summer Sale 2026: June 1 - Aug 31
- Festival Offer: Oct 1 - Oct 15

**Customer Bills:**
- June 15: Bought 10 Khakhra @ ₹50 = ₹500
- July 20: Bought 5 Khakhra @ ₹50 = ₹250
- Oct 5: Bought 3 Papad @ ₹30 = ₹90

**Display Shows:**
```
Product         | Qty | Rate | Total  | Schemes
Khakhra         | 15  | ₹50  | ₹750   | Summer Sale 2026
Papad           | 3   | ₹30  | ₹90    | Festival Offer
```

### Benefits:

1. **Easy Customer Communication**
   - "You've purchased 15 Khakhra during our Summer Sale!"
   - "You've bought ₹750 worth of products during active schemes"

2. **Sales Insights**
   - See which products customers buy during schemes
   - Track customer engagement with promotions

3. **Comprehensive View**
   - See ALL products, not just scheme-specific ones
   - Helps identify customer preferences during promotional periods

## Sections in Customer History (In Order):

1. **Summary Cards** - Total Amount, Invoices, Items
2. **Manually Added Packets** (Amber) - Manual entries
3. **Products Purchased During Active Schemes** (Blue) - NEW! All products during scheme periods
4. **Scheme Purchases** (Green) - Only scheme-specific products
5. **Filters** - Date and sort filters
6. **Bills List** - Individual bill details

## Technical Details:

- Uses `useMemo` for performance
- Automatically filters expired schemes
- Sorts products by total amount (highest first)
- Real-time calculation based on bills and schemes
- No database changes required

---

All features working and ready to use! 🎉
