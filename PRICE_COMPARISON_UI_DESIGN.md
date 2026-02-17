# AI Price Comparison - UI Flow & Visual Design

## User Interface Overview

This document describes the visual design and user experience of the AI Price Comparison feature.

## Receipt Detail Page Layout

### Header Section
```
┌─────────────────────────────────────────┐
│  ← Detalle del Recibo                   │
└─────────────────────────────────────────┘
```

### Receipt Image
```
┌─────────────────────────────────────────┐
│                                         │
│         [Receipt Image]                 │
│                                         │
└─────────────────────────────────────────┘
```

### Summary Card
```
┌─────────────────────────────────────────┐
│  Store Name                             │
│  2024-01-15                             │
│  ─────────────────────────────────────  │
│  Total:            $45.67              │
│  Categoría: [groceries chip]           │
│  Resumen IA: Weekly grocery shopping    │
└─────────────────────────────────────────┘
```

### Items Card with Price Comparisons

#### Before Price Comparison Load
```
┌─────────────────────────────────────────┐
│  Artículos (3)                          │
│  🔄 Buscando mejores precios...        │
│  ─────────────────────────────────────  │
│  Milk                                   │
│  Cantidad: 1                    $4.99   │
│  [beverages]                            │
│  ─────────────────────────────────────  │
│  ...more items...                       │
└─────────────────────────────────────────┘
```

#### After Price Comparison Load (with savings)
```
┌─────────────────────────────────────────┐
│  Artículos (3)                          │
│  📉 Ahorro potencial: $3.45            │
│  ─────────────────────────────────────  │
│  Milk                                   │
│  Cantidad: 1                    $4.99   │
│  [beverages]                            │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ 🏷️ Opciones más baratas:         │ │
│  │                                   │ │
│  │ ╔═══════════════════════════════╗ │ │
│  │ ║ 🌐 Walmart Online            ║ │ │
│  │ ║ $3.79  [-$1.20 (24%)]        ║ │ │
│  │ ║ 🔗 Ver producto              ║ │ │
│  │ ╚═══════════════════════════════╝ │ │
│  │                                   │ │
│  │ ╔═══════════════════════════════╗ │ │
│  │ ║ 📍 Target Store              ║ │ │
│  │ ║ $3.99  [-$1.00 (20%)]        ║ │ │
│  │ ║ 📍 123 Main St, Downtown     ║ │ │
│  │ ╚═══════════════════════════════╝ │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ─────────────────────────────────────  │
│  Bread                                  │
│  Cantidad: 2                    $3.49   │
│  [food]                                 │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ 🏷️ Opciones más baratas:         │ │
│  │                                   │ │
│  │ ╔═══════════════════════════════╗ │ │
│  │ ║ 🌐 Amazon Fresh              ║ │ │
│  │ ║ $2.99  [-$0.50 (14%)]        ║ │ │
│  │ ║ 🔗 Ver producto              ║ │ │
│  │ ╚═══════════════════════════════╝ │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ─────────────────────────────────────  │
│  ...more items...                       │
└─────────────────────────────────────────┘
```

## Color Scheme

### Price Comparison Elements

- **Container Background**: `var(--ion-color-light)` - Light gray
- **Border**: `var(--ion-color-success)` - Green (4px left border)
- **Header Icon**: `var(--ion-color-success)` - Green
- **Comparison Items**: `var(--ion-color-light-tint)` - Slightly lighter gray
- **Store Name**: Black/default text
- **Price**: `var(--ion-color-primary)` - Blue
- **Savings Chip**: `var(--ion-color-success)` - Green background
- **Online Icon**: `var(--ion-color-primary)` - Blue
- **Local Icon**: `var(--ion-color-tertiary)` - Tertiary color

### Icons Used

- `pricetag-outline` - Price comparison header
- `globe-outline` - Online availability
- `location-outline` - Local store
- `cart-outline` - Both online and local
- `arrow-down` - Savings indicator
- `trending-down` - Total savings in header
- `open-outline` - External link icon
- `pin-outline` - Location pin

## Visual States

### 1. Loading State
```
┌─────────────────────────────────────────┐
│  Artículos (3)                          │
│  [spinner] Buscando mejores precios... │
│  ─────────────────────────────────────  │
│  [Items displayed normally]             │
└─────────────────────────────────────────┘
```
- Shows spinning dots indicator
- All items visible but no comparisons yet

### 2. Loaded with Savings
```
┌─────────────────────────────────────────┐
│  Artículos (3)                          │
│  📉 Ahorro potencial: $3.45 (SUCCESS)  │
│  ─────────────────────────────────────  │
│  [Items with price comparison boxes]    │
└─────────────────────────────────────────┘
```
- Green success color for savings summary
- Comparison boxes appear under relevant items

### 3. No Savings Found
```
┌─────────────────────────────────────────┐
│  Artículos (3)                          │
│  ─────────────────────────────────────  │
│  [Items displayed without comparisons]  │
└─────────────────────────────────────────┘
```
- No special header message
- Items display normally
- No comparison boxes shown

### 4. API Key Not Configured
```
┌─────────────────────────────────────────┐
│  Artículos (3)                          │
│  ─────────────────────────────────────  │
│  [Items displayed without comparisons]  │
└─────────────────────────────────────────┘
```
- Silent failure
- No error messages shown
- Feature degrades gracefully

## Interaction Design

### Price Comparison Cards

Each comparison card is **tappable/clickable** and includes:

1. **Store Information**
   - Icon indicating online/local/both
   - Store name in bold
   
2. **Price Information**
   - New price (large, primary color)
   - Savings chip (green badge with amount and %)
   
3. **Additional Info**
   - URL link with "Ver producto" for online stores
   - Location address for local stores

### Links Behavior

- **External Product Links**: Open in new browser tab/window
- **Hover Effect**: Underline appears on hover
- **Mobile**: Full row is tappable

## Responsive Design

### Mobile (< 768px)
- Full width cards
- Stack elements vertically
- Larger touch targets
- Simplified layout

### Tablet/Desktop (>= 768px)
- Max width containers
- More horizontal space utilization
- Same layout but more breathing room

## Animation & Transitions

### Loading State
- Spinner rotates continuously
- Smooth fade-in when comparisons appear

### Comparison Cards
- Fade in from top as data loads
- Subtle shadow on hover (desktop)
- Pressed state on touch (mobile)

## Accessibility

### ARIA Labels
- All icons have descriptive labels
- Links include screen reader text
- Savings percentages are announced

### Keyboard Navigation
- All interactive elements are focusable
- Logical tab order (top to bottom)
- Enter key activates links

### Color Contrast
- All text meets WCAG AA standards
- Success green has sufficient contrast
- Primary blue is accessible

## Edge Cases

### 1. Item with No Cheaper Options
- No comparison box shown
- Item displays normally

### 2. Multiple Items, Mixed Results
- Some items show comparisons
- Others show normally
- Total savings only counts items with savings

### 3. Network Error
- Silent failure
- No comparison boxes
- User can still view receipt

### 4. Very Long Store Names
- Text truncates with ellipsis
- Full name in tooltip/title attribute

### 5. Many Alternatives (3+ options)
- All displayed in scrollable container
- Maximum 3 shown per item (by design)

## Real-World Example

**Scenario**: User scans grocery receipt with 5 items

**Before feature**:
```
Milk - $4.99
Bread - $3.49
Eggs - $5.99
Coffee - $12.99
Bananas - $2.49
Total: $29.95
```

**After feature loads**:
```
Milk - $4.99
  → Walmart: $3.79 (save $1.20, 24%)
  → Target: $3.99 (save $1.00, 20%)

Bread - $3.49
  → Amazon Fresh: $2.99 (save $0.50, 14%)

Eggs - $5.99
  (no cheaper options found)

Coffee - $12.99
  → Costco: $10.99 (save $2.00, 15%)
  → Sam's Club: $11.49 (save $1.50, 12%)

Bananas - $2.49
  (no cheaper options found)

💰 Ahorro potencial: $4.70
```

User can click links to buy online or note local stores to visit.

## Technical Notes

### Performance
- Comparisons load in background
- No blocking of main UI
- Sequential API calls prevent rate limiting

### Caching
- Results cached in component state
- Cleared when navigating away
- Reloaded on page refresh

### Error Handling
- All errors fail silently
- Console logs for debugging
- No user-facing error messages

## Future Enhancements

Visual improvements for future versions:

1. **Charts**: Show price trends over time
2. **Maps**: Display local stores on a map
3. **Filters**: Filter by online/local only
4. **Sort**: Sort by highest savings first
5. **Favorites**: Save preferred stores
6. **Notifications**: Alert when prices drop
7. **Compare View**: Side-by-side comparison table

---

This UI design prioritizes:
- ✅ Clear information hierarchy
- ✅ Minimal visual clutter
- ✅ Actionable insights
- ✅ Mobile-first approach
- ✅ Graceful degradation
- ✅ Accessibility standards
