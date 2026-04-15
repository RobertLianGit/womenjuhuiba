/**
 * 结算算法
 */

/**
 * 计算 AA 均摊
 * @param scenes 每场账单信息
 * @returns 每人应付金额列表
 */
export const calculateSplit = (
  scenes: Array<{
    scene_name: string
    total_amount: number
    participant_ids: string[]
    participants: Array<{ user_id: string; people_count: number }>
  }>
) => {
  const splits: Record<string, number> = {}

  for (const scene of scenes) {
    if (scene.participants.length === 0) continue
    const perPerson = scene.total_amount / scene.participants.length
    for (const p of scene.participants) {
      const key = `${p.user_id}-${scene.scene_name}`
      splits[key] = (splits[key] || 0) + perPerson * p.people_count
    }
  }

  // 按人汇总
  const userSplits: Record<string, number> = {}
  for (const [key, amount] of Object.entries(splits)) {
    const userId = key.split('-').slice(0, -1).join('-')
    userSplits[userId] = (userSplits[userId] || 0) + amount
  }

  return Object.entries(userSplits).map(([user_id, amount]) => ({
    user_id,
    amount: Math.round(amount * 100) / 100,
  }))
}

/**
 * 计算谁欠谁最优路径（贪心算法）
 * @param splits 每人应付
 * @param payments 每人实付
 * @returns 转账指引
 */
export const calculateOptimalDebts = (
  splits: Array<{ user_id: string; amount: number }>,
  payments: Array<{ user_id: string; amount: number }>
) => {
  const balances: Record<string, number> = {}

  // 应付为负，实收为正
  for (const s of splits) {
    balances[s.user_id] = (balances[s.user_id] || 0) - s.amount
  }
  for (const p of payments) {
    balances[p.user_id] = (balances[p.user_id] || 0) + p.amount
  }

  const creditors: Array<{ user_id: string; amount: number }> = []
  const debtors: Array<{ user_id: string; amount: number }> = []

  for (const [user_id, balance] of Object.entries(balances)) {
    if (balance > 0.01) creditors.push({ user_id, amount: balance })
    if (balance < -0.01) debtors.push({ user_id, amount: -balance })
  }

  creditors.sort((a, b) => b.amount - a.amount)
  debtors.sort((a, b) => b.amount - a.amount)

  const transactions: Array<{ from: string; to: string; amount: number }> = []

  let i = 0,
    j = 0
  while (i < creditors.length && j < debtors.length) {
    const credit = creditors[i]
    const debt = debtors[j]
    const amount = Math.min(credit.amount, debt.amount)

    if (amount > 0.01) {
      transactions.push({
        from: debt.user_id,
        to: credit.user_id,
        amount: Math.round(amount * 100) / 100,
      })
    }

    credit.amount -= amount
    debt.amount -= amount
    if (credit.amount < 0.01) i++
    if (debt.amount < 0.01) j++
  }

  return transactions
}
