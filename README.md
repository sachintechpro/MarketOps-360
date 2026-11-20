# MarketOps 360

**Connected retail operations — an end-to-end grocery retail experience prototype.**

MarketOps 360 is a front-end-only demonstration of a connected grocery retailer: customer shopping, store operations, merchandising, procurement, warehouse execution, workforce, analytics and enterprise expansion/program delivery.

## Demo experiences

- **Customer storefront:** departments, product discovery, search, category filters, basket and simulated checkout/order history.
- **Retail operations:** executive and regional overview, stores, product catalog, category taxonomy, promotions, inventory, procurement, supplier directory, purchase orders, warehouse, receiving, transfers, POS, customer fulfillment, workforce and exception tasks.
- **Enterprise delivery:** expansion stage gates, program portfolio, project delivery, release calendar, risks/issues/decisions and operational analytics.
- **Role-based navigation:** Executive, Regional Manager, Store Manager, Merchandising Manager, Buyer/Procurement, Warehouse Manager, Store Associate, IT Program Manager and Customer.
- **Connected demo behavior:** shared product/inventory/order/task state across the experiences, simulated inventory adjustments, purchase/order actions and customer basket.

## Run locally

Open `index.html` in a browser. No build step, backend, database or API keys are required.

## Deploy on Render

Create a **Static Site** using this repository:
- Build command: leave blank
- Publish directory: `.`

Alternatively, use the included `render.yaml` blueprint.

## Demo limitations

This is an intentionally front-end-only prototype. Data is illustrative and held in browser memory for the active session. Authentication, payment processing, tax calculation, live inventory synchronization, supplier/ERP/POS integrations, real notifications, persistence and production security are not implemented. Role selection demonstrates role-specific experiences; it is not an authorization boundary.

## Design intent

The prototype uses a fictional retail identity and original sample content. It is not affiliated with or endorsed by any retailer. Product names, prices, locations, supplier names, KPIs and operating metrics are illustrative.
