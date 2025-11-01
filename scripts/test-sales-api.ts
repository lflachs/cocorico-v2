import { getSalesData } from '@/lib/actions/cocorico-assistant.actions';

async function testSalesAPI() {
  console.log('🧪 Testing Sales API Functions\n');

  // Test today's sales
  console.log('📊 Today\'s sales:');
  const todaySales = await getSalesData('today');
  console.log(JSON.stringify(todaySales, null, 2));

  console.log('\n📊 This week\'s sales:');
  const weekSales = await getSalesData('week');
  console.log(JSON.stringify(weekSales, null, 2));

  console.log('\n📊 This month\'s sales:');
  const monthSales = await getSalesData('month');
  console.log(JSON.stringify(monthSales, null, 2));

  // Check if Black Angus is in the results
  const hasBlackAngus = [todaySales, weekSales, monthSales].some((data) =>
    data.topDishes.some((dish) => dish.name.toLowerCase().includes('onglet'))
  );

  console.log(`\n${hasBlackAngus ? '✅' : '❌'} Black Angus (L'onglet de bœuf) ${hasBlackAngus ? 'found' : 'NOT found'} in sales data`);
}

testSalesAPI()
  .then(() => console.log('\n✅ Test complete'))
  .catch((e) => {
    console.error('❌ Test failed:', e);
    process.exit(1);
  });
