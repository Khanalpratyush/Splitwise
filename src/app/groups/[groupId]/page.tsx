import Link from 'next/link';

export default function GroupPage({ params }: { params: { groupId: string } }) {
  const groupName = params.groupId.split('-').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');

  return (
    <div className="min-h-screen bg-gray-100">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Link 
            href="/groups" 
            className="text-emerald-600 hover:text-emerald-700 mb-4 inline-block"
          >
            ← Back to Groups
          </Link>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-medium text-2xl">
                {groupName[0]}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{groupName}</h1>
                <p className="text-gray-600">4 members • Created Jan 2024</p>
              </div>
            </div>
            <button className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700">
              Add Expense
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Balance Summary */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4">Group Balances</h2>
              <div className="space-y-3">
                <BalanceItem name="You" amount={-25.50} />
                <BalanceItem name="John Doe" amount={45.00} />
                <BalanceItem name="Sarah Smith" amount={-12.75} />
                <BalanceItem name="Mike Johnson" amount={-6.75} />
              </div>
            </div>

            {/* Recent Expenses */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4">Recent Expenses</h2>
              <div className="space-y-4">
                <ExpenseItem
                  description="Dinner"
                  amount={45.00}
                  date="2024-03-15"
                  paidBy="John"
                />
                <ExpenseItem
                  description="Groceries"
                  amount={85.30}
                  date="2024-03-14"
                  paidBy="Sarah"
                />
              </div>
            </div>
          </div>

          {/* Members */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4">Members</h2>
              <div className="space-y-3">
                <MemberItem name="You" email="you@example.com" />
                <MemberItem name="John Doe" email="john@example.com" />
                <MemberItem name="Sarah Smith" email="sarah@example.com" />
                <MemberItem name="Mike Johnson" email="mike@example.com" />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function BalanceItem({ name, amount }: { name: string; amount: number }) {
  return (
    <div className="flex justify-between items-center py-2">
      <span className="font-medium text-gray-900">{name}</span>
      <span className={`font-medium ${amount >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
        {amount >= 0 ? `+$${Math.abs(amount)}` : `-$${Math.abs(amount)}`}
      </span>
    </div>
  );
}

function ExpenseItem({ description, amount, date, paidBy }: {
  description: string;
  amount: number;
  date: string;
  paidBy: string;
}) {
  return (
    <div className="flex justify-between items-center py-3 border-b last:border-0">
      <div>
        <p className="font-medium text-gray-900">{description}</p>
        <p className="text-sm text-gray-600">
          {paidBy} paid • {new Date(date).toLocaleDateString()}
        </p>
      </div>
      <span className="font-medium text-gray-900">${amount.toFixed(2)}</span>
    </div>
  );
}

function MemberItem({ name, email }: { name: string; email: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-700 font-medium">
        {name.split(' ').map(n => n[0]).join('')}
      </div>
      <div>
        <p className="font-medium text-gray-900">{name}</p>
        <p className="text-sm text-gray-600">{email}</p>
      </div>
    </div>
  );
} 