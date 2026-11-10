import { expenseCategories } from './expenseCategories'

export type GroceryItem = { name: string; category: string; amount: string; quantity: string }
export type StoredGroceryItem = { name: string; category: string; amount: number; quantity?: number; unit_price?: number }
export const completeItem = (item: GroceryItem) => item.name.trim().length > 0 && item.name.trim().length <= 100 && expenseCategories.Supermercado.includes(item.category) && /^\d+(\.\d{1,2})?$/.test(item.amount) && Number(item.amount) > 0 && Number(item.amount) <= 100000000 && /^\d+(\.\d{1,3})?$/.test(item.quantity) && Number(item.quantity) > 0 && Number(item.quantity) <= 1000000 && Math.round(Math.round(Number(item.amount) * 100) * Number(item.quantity)) > 0
export const groceryLineCents = (item: GroceryItem) => Math.round(Math.round(Number(item.amount) * 100) * Number(item.quantity))
export const groceryTotal = (items: GroceryItem[]) => items.filter(completeItem).reduce((sum, item) => sum + groceryLineCents(item), 0) / 100