# Billing System Feature

## Overview
A comprehensive billing and invoicing system for both web and Android platforms with digital bill verification, QR code sharing, and print capabilities.

## Features

### 1. Bill Creation & Management
- **Multi-item invoicing** with quantity, unit, price, discount, and tax support
- **Customer search** from existing database with auto-fill
- **Payment tracking** - Cash, UPI, Card, Credit modes
- **Flexible payment** - Full payment, partial payment, or credit
- **Additional charges** - Shipping, other charges, round-off adjustments
- **Notes & Terms** - Custom notes and terms & conditions
- **Draft & Send** - Save as draft or send immediately

### 2. Bill Display & Details
- **Professional layout** with shop and customer details
- **Itemized breakdown** with individual pricing and totals
- **Payment status badges** - Paid (green), Unpaid (red), Partial (amber)
- **Summary calculations** - Subtotal, discount, tax, shipping, grand total
- **Payment history** - Track all payments against the bill
- **View tracking** - Count how many times bill was viewed

### 3. Digital Bill Features
- **Unique verification code** for each bill
- **Public bill page** - Shareable link that customers can access
- **QR code generation** - Scan to view digital bill
- **No login required** for customers to view bills
- **Mobile-optimized** viewing experience
- **Download as image** (PNG) capability
- **Screenshot-friendly** layout

### 4. Bill Sharing & Distribution
- **Share via WhatsApp** - Direct share with QR code
- **Copy link** - Share verification URL
- **QR display modal** - Show QR code for scanning
- **Print functionality** - Browser print with optimized layout
- **Download bill image** - Save as PNG for offline access

### 5. Payment Recording
- **Record partial payments** on existing bills
- **Multiple payment modes** support
- **Automatic transaction creation** when payment is recorded
- **Balance due calculation** updates automatically
- **Payment status updates** - Unpaid → Partial → Paid

### 6. Bill Management Dashboard
- **Summary cards** - Total sales, paid, due, partial counts
- **Advanced filters** - By payment status, bill status, date range, customer
- **Search functionality** - Search by bill number, customer name/phone
- **Pagination** for large bill lists
- **Quick stats** - Sales overview and trends
- **Status indicators** - Draft, Sent, Viewed, Paid, Cancelled

### 7. Bill Statistics & Reports
- **Total sales** tracking
- **Payment breakdown** - Paid vs due amounts
- **Bill count** by status
- **Top customers** by purchase value
- **Monthly trends** - Sales over time
- **Payment mode analysis** - Cash, UPI, Card breakdown

## Technical Implementation

### Backend (Server)

#### Models
- **Bill Model** (`server/src/models/Bill.js`)
  - Bill number generation with date-based sequence
  - Verification code for public access
  - Automatic total calculations
  - Payment status management
  - View tracking
  - Status workflow (draft → sent → viewed → paid)

#### API Endpoints
- **GET `/api/bills`** - List all bills with filters
- **GET `/api/bills/:id`** - Get single bill details
- **POST `/api/bills`** - Create new bill
- **PUT `/api/bills/:id`** - Update bill
- **POST `/api/bills/:id/payment`** - Record payment
- **POST `/api/bills/:id/cancel`** - Cancel bill
- **GET `/api/bills/public/:verificationCode`** - Public bill view (no auth)
- **GET `/api/bills/stats/overview`** - Bill statistics

#### Services
- **Bill Service** (`server/src/services/billService.js`)
  - SVG bill image generation
  - QR code generation for verification
  - Thermal receipt generation (printer-style)
  - PDF generation support (future)

### Frontend (Client)

#### Pages
1. **Bills List** (`/dashboard/bills/page.js`)
   - Summary cards with key metrics
   - Filter and search interface
   - Bill cards with payment status
   - Pagination controls
   - Floating create button

2. **Create Bill** (`/dashboard/bills/create/page.js`)
   - Customer search and selection
   - Dynamic item rows (add/remove)
   - Real-time total calculation
   - Payment mode selection
   - Notes and terms input
   - Save draft or create bill

3. **Bill Detail** (`/dashboard/bills/[id]/page.js`)
   - Professional invoice layout
   - Print-optimized view
   - Payment recording modal
   - QR code display modal
   - Share functionality
   - Download as image

4. **Public Bill View** (`/bill/[code]/page.js`)
   - No authentication required
   - Customer-friendly layout
   - Shop details display
   - Download and share options
   - View count tracking
   - Mobile-responsive design

## Security Features

1. **Verification Codes**
   - Random 30-character alphanumeric codes
   - Unique per bill
   - Non-guessable URLs

2. **Authentication**
   - Protected routes for bill management
   - Public routes only for viewing
   - User-scoped data access

3. **Data Validation**
   - Input sanitization
   - Amount validations
   - Status transition rules

4. **Rate Limiting**
   - API rate limits applied
   - Prevents abuse of public endpoints

## User Experience

### For Shop Owners
1. Navigate to "Bills" from dashboard menu
2. View sales summary and bill list
3. Click "+" to create new bill
4. Search/select customer or enter new details
5. Add items with pricing
6. Set payment details
7. Create bill
8. View bill with QR code
9. Share via WhatsApp or show QR to customer
10. Record payments as they come in

### For Customers
1. Receive bill link or scan QR code
2. View bill details without login
3. See shop information
4. Download bill as image
5. Screenshot for records
6. Share with others if needed
7. Access anytime using the link

## Mobile App Features (Android)

### Native Capabilities
- **Share API integration** - Native Android share sheet
- **QR scanning** - Use camera to scan bill QR codes
- **Offline viewing** - Cache viewed bills
- **WhatsApp direct share** - Share bill to WhatsApp contacts
- **Print integration** - Connect to Bluetooth printers (future)

### Capacitor Integration
```javascript
// Share bill via native share
import { Share } from '@capacitor/share';

await Share.share({
  title: 'Invoice',
  text: 'View your bill',
  url: billUrl,
  dialogTitle: 'Share Invoice'
});
```

## Bill Number Format
`INV-YYMM-XXXXXX-NNNN`
- `INV` - Invoice prefix
- `YYMM` - Year and month
- `XXXXXX` - Timestamp portion (last 6 digits)
- `NNNN` - Sequential number for the day

Example: `INV-2602-814891-0001`

## Database Schema

### Bill Document
```javascript
{
  billNumber: String (unique),
  verificationCode: String (unique),
  userId: ObjectId (ref: User),
  shopId: ObjectId (ref: Shop),
  
  // Customer
  customerName: String (required),
  customerPhone: String,
  customerEmail: String,
  customerAddress: String,
  
  // Items
  items: [{
    name: String,
    quantity: Number,
    unit: String,
    price: Number,
    discount: Number,
    taxPercent: Number,
    total: Number
  }],
  
  // Financials
  subtotal: Number,
  totalDiscount: Number,
  totalTax: Number,
  shippingCharges: Number,
  otherCharges: Number,
  roundOff: Number,
  grandTotal: Number,
  amountPaid: Number,
  amountDue: Number,
  
  // Payment
  paymentMode: String (cash|upi|card|credit|partial),
  paymentStatus: String (paid|unpaid|partial),
  transactionId: ObjectId (ref: Transaction),
  
  // Dates
  billDate: Date,
  dueDate: Date,
  
  // Status
  status: String (draft|sent|viewed|paid|cancelled),
  viewCount: Number,
  lastViewedAt: Date,
  
  // Metadata
  notes: String,
  termsAndConditions: String,
  
  timestamps: true
}
```

## Future Enhancements

### Phase 2
- [ ] PDF generation and download
- [ ] Email bill to customer
- [ ] SMS notification with link
- [ ] Recurring bills/subscriptions
- [ ] Bill templates (design customization)
- [ ] Logo upload for bills
- [ ] GST integration and compliance
- [ ] E-way bill generation

### Phase 3
- [ ] Inventory management integration
- [ ] Stock deduction on bill creation
- [ ] Low stock alerts
- [ ] Purchase order generation
- [ ] Vendor bill management
- [ ] Expense tracking via bills

### Phase 4
- [ ] Bluetooth printer integration (Android)
- [ ] Thermal printer support
- [ ] Receipt templates (58mm, 80mm)
- [ ] Barcode scanner integration
- [ ] POS mode for retail shops

### Phase 5
- [ ] Multi-currency support
- [ ] Multi-language bills
- [ ] Payment gateway integration
- [ ] Online payment links
- [ ] Automated payment reminders
- [ ] Credit limit management per customer

## Testing Checklist

### Bill Creation
- [ ] Create bill with single item
- [ ] Create bill with multiple items
- [ ] Apply discount and tax
- [ ] Add shipping charges
- [ ] Save as draft
- [ ] Create with payment
- [ ] Create with credit

### Bill Viewing
- [ ] View bill in dashboard
- [ ] View public bill via link
- [ ] Scan QR code to view
- [ ] Print bill
- [ ] Download as image
- [ ] Share via WhatsApp

### Payment Recording
- [ ] Record full payment
- [ ] Record partial payment
- [ ] Multiple partial payments
- [ ] Mark as paid
- [ ] Payment status updates

### Filters & Search
- [ ] Filter by payment status
- [ ] Filter by bill status
- [ ] Filter by date range
- [ ] Search by bill number
- [ ] Search by customer name
- [ ] Pagination works correctly

### Mobile Testing
- [ ] Create bill on mobile
- [ ] View bill on mobile
- [ ] Share bill on mobile
- [ ] QR scanning works
- [ ] Responsive layout
- [ ] Touch targets are adequate

## Configuration

### Environment Variables

**Server (.env)**
```env
CLIENT_URL=https://yourapp.com  # Used for QR code generation
```

**Client (.env.local)**
```env
NEXT_PUBLIC_API_URL=https://api.yourapp.com
```

### Default Settings
- Bills per page: 20
- QR code size: 400x400 pixels
- Bill number sequence resets: Daily
- Public bill link expiry: Never (configurable in future)
- Max items per bill: Unlimited

## API Response Examples

### Create Bill Response
```json
{
  "bill": {
    "_id": "...",
    "billNumber": "INV-2602-814891-0001",
    "verificationCode": "abc123xyz789...",
    "customerName": "John Doe",
    "grandTotal": 1500,
    "paymentStatus": "paid",
    "status": "sent"
  },
  "message": "Bill created successfully"
}
```

### Public Bill Response
```json
{
  "bill": { /* full bill details */ },
  "shop": {
    "name": "ABC Store",
    "phone": "1234567890",
    "address": "123 Main St",
    "upiId": "abc@upi"
  }
}
```

## Support & Documentation
- For API details, see `/server/src/routes/bills.js`
- For frontend components, see `/client/src/app/dashboard/bills/`
- For models, see `/server/src/models/Bill.js`
- For service functions, see `/server/src/services/billService.js`

---

**Powered by Desklite** - Professional Billing Made Simple
