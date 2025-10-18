# Database Seeding

This directory contains the database seed script to populate your Cocorico database with realistic restaurant data.

## What's Included

The seed script (`seed.ts`) creates realistic test data based on **Sens Unique Restaurant** menu:

### Users
- **Admin**: `admin@cocorico.fr` / `admin123`
- **User**: `user@cocorico.fr` / `user123`

### Products (16 base ingredients)
- Dairy products (milk, cream, butter, eggs)
- Dry goods (flour, sugar, salt)
- Proteins (chicken, beef, salmon)
- Vegetables (potatoes, carrots, onions, tomatoes)
- Herbs (parsley bunches, thyme bunches) - using the new BUNCH unit

### Composite Products (2 prepared ingredients)
- **Crème pâtissière** - made from milk, eggs, sugar, flour
- **Sauce béchamel** - made from milk, butter, flour

### Dishes (21 authentic French dishes)

**Entrées (6):**
- La mer (€16)
- Le carpaccio de veau « cuit rosé » (€17)
- La tarte sablée végétarienne (€17)
- Le foie gras et le magret fumé de canard (€21)
- Les escargots de Bourgogne (€19)
- Le céviché de bar (€20)

**Plats (8):**
- Le filet de daurade royale (€30)
- Les grosses gambas « black tiger » (€37)
- L'onglet de bœuf « Black Angus » (€32)
- L'épaule agneau française (€32)
- Le quasi de veau français (€36)
- La poularde Arnaud Tauzin (€37)
- Le végétal (€24)
- La côte de bœuf Simmental - pour 2 personnes (€92)

**Desserts (7):**
- La rhubarbe (€14)
- Les primeurs de fraises (€14)
- Le véritable mille-feuille (€14)
- La madeleine « de Proust » au citron (€15)
- Le gourmand (€15)
- Le chocolat « Xoco » (€17)
- Les fromages « de la maison Guibert » (€15)

### Menus (2)
- **Menu Canaille** - Prix fixe 3-course menu (€49)
- **Menu Gourmand** - Prix fixe 3-course premium menu (€68)

### Additional Data
- 2 supplier bills with stock movements
- 12 sales records across 3 days
- 4 DLC (best-before) records

## How to Run

### Option 1: Using npm script
```bash
npm run db:seed
```

### Option 2: Using Prisma CLI
```bash
npx prisma db seed
```

### Option 3: Direct execution
```bash
npx tsx prisma/seed.ts
```

## Important Notes

⚠️ **Warning**: The seed script will **delete all existing data** before seeding. Make sure you're running this on a development database only.

## Reset and Seed

If you want to completely reset your database and reseed it:

```bash
npx prisma migrate reset
```

This will:
1. Drop the database
2. Recreate it
3. Run all migrations
4. Automatically run the seed script

## Troubleshooting

### Error: Database connection failed
Make sure your `.env` file has the correct `DATABASE_URL` configured.

### Error: Module not found
Run `npm install` to ensure all dependencies are installed, including `tsx` and `bcryptjs`.

### Error: Unique constraint violation
This happens if data already exists. The seed script cleans up data first, but if you encounter this, try:
```bash
npx prisma migrate reset
```
