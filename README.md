# ROXO | Sistema de Gestion

Demo web para administrar una noche de boliche/bar. Preparado como prueba para sistema Club Roxo.

## Como usar

Abrir `index.html` en el navegador. La aplicacion guarda la informacion en el navegador con `localStorage`, por lo que no requiere instalacion ni servidor para esta version inicial.

## Publicar en Render

1. Subir estos archivos a un repositorio de GitHub.
2. Entrar a Render y crear un nuevo `Static Site`.
3. Conectar el repositorio.
4. Usar:
   - Build Command: dejar vacio.
   - Publish Directory: `.`
5. Render tambien puede detectar `render.yaml` automaticamente.

## Validar antes de publicar

Ejecutar:

```bash
npm run check
```

## Modulos incluidos

- Jornada ROXO: apertura y cierre de cada noche operativa de fin de semana.
- Apertura de caja con responsable, efectivo inicial y hora de apertura.
- Cierre de caja con arqueo profesional: esperado, contado, diferencia y observacion.
- Bloqueos operativos: no se puede vender con la jornada o la caja cerrada.
- Cierre general: no permite cerrar la noche si quedan cajas abiertas.
- Acceso por puesto: administrador, caja bebidas, ingreso y mozos.
- Acceso por puesto ampliado: administrador, caja bebidas, ingreso, puerta, mozos y deposito.
- Vista Control para manejar la noche desde celular: corte de alcohol, palabra de comanda, retiros, anulaciones y conteo de caja.
- Interfaz tipo software de gestion: compacta, modular, con barra de estado y navegacion inferior en celular.
- Interfaz tipo app: Inicio, Vender, Control y Cierre como acciones principales.
- Navegacion de app con boton Atras, Inicio e historial interno.
- Pantalla Vender con pestañas simples: Entrada, Barra y Mesa.
- Logo oficial ROXO integrado en inicio y cabecera.
- Panel Analisis con filtros por hoy, fecha exacta o mes.
- Graficos simples de ventas por area y dinero.
- Movimientos de dinero: ingresos y salidas para proveedores, empleados, mercaderia, ajustes y otros.
- Arqueo profesional por caja con esperado, contado y diferencia.
- Tickets/comandas numeradas para ventas de barra.
- Tickets/comandas numeradas para cobros de mesa.
- Anulaciones con estado pendiente, aprobada o rechazada.
- Anulaciones asociadas a caja/ticket para descontar del arqueo.
- Conteo real de stock contra stock teorico.
- Configuracion de datos maestros: productos, cajas, entradas, RRPP, tarjetas VIP, medios de pago y ubicaciones.
- Exportacion CSV del cierre por caja.
- Panel general con ventas, ingreso, gastos, mesas ocupadas y stock bajo.
- 9 cajas iniciales, incluida caja de ingreso.
- Apertura/cierre de cajas, operador y monto inicial.
- Venta de entradas: precinto general, VIP, puerta y cortesia.
- Inventario real de precintos: inicial, entregados, vendidos, cortesias, usados en puerta, roturas y sobrantes.
- Control de puerta con codigo de entrada y validacion de uso.
- RRPP para asociar ventas e invitaciones.
- Tarjetas VIP/cashless con saldo y recargas.
- Venta rapida de bar con descuento automatico de stock.
- POS de bebidas para cajero: productos grandes, carrito, total y cobro.
- Control de mesas con mozo, consumos, saldo y cobro.
- Stock de bebidas, tragos, combos y comida por deposito/barra.
- Transferencias entre deposito y barras.
- Registro de roturas, faltantes y ajustes.
- Reposicion y alerta de stock minimo.
- Gastos por categoria: empleados, seguridad, cajeros, mozos, DJ, limpieza, proveedores, mantenimiento y extras.
- Reportes de cierre por caja, entradas, productos vendidos, bruto, gastos y neto estimado.
- Reporte de stock por ubicacion y auditoria de movimientos.
- Impresion de reporte desde la seccion Reportes.

## Nota

Para convertirlo en un sistema online multiusuario real, el siguiente paso es agregar backend, base de datos y autenticacion. Esta version ya deja lista la operativa principal para probar el flujo completo de una noche.

## Flujo recomendado

1. Entrar como Administrador.
2. Ir a Control y abrir/guardar la jornada ROXO.
3. Ir a Cajas y abrir cada caja con cajero y efectivo inicial.
4. Operar ventas desde Ingreso, Bar y Mesas.
5. Solicitar anulaciones desde Control y aprobar/rechazar.
6. Cerrar cada caja con arqueo profesional.
7. Cerrar la noche desde Control.
8. Revisar Reportes, imprimir o exportar CSV.
