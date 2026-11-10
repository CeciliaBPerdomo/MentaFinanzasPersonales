export const expenseCategories: Record<string, string[]> = {
  'Supermercado': ['Frutas y verduras', 'Carnes y pescado', 'Lácteos y huevos', 'Almacén', 'Panadería', 'Bebidas', 'Limpieza', 'Higiene personal', 'Mascotas', 'Otros'],
  'Gastos mensuales': ['UTE', 'ANTEL', 'OSE', 'BPS', 'ANCEL', 'Seguridad Norpe', 'Otros'],
  'Gastos anuales': ['Impuesto a Primaria', 'Contribución Inmobiliaria', 'Otros'],
  'Salidas y diversión': ['Restaurantes', 'Cafeterías', 'Cine', 'Teatro y espectáculos', 'Paseos y excursiones', 'Deportes y actividades', 'Otros'],
  'Gastos casa': [],
  'Compras': [],
  'Servicios': [],
  'Otros': [],
}

export function expenseGroup(category: string) {
  return category === 'Restaurantes' ? 'Salidas y diversión' : category
}