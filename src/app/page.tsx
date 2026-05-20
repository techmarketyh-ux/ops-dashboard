'use client'
import { useState, useCallback } from 'react'
import { GeneralMetrics, ProductMetrics, ProductMapping } from '@/lib/types'
import { colorCPA, colorConfirmRate, colorCPAReal, colorCostPerConv, colorCloseRate } from '@/lib/metrics'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'

// ── Helpers de color ─────────────────────────────────────────────────────────
function metricClass(color: string) {
  return `metric-${color} rounded-lg p-3`
}
function pillClass(color: string) {
  return `pill-${color} text-xs font-medium px-2 py-0.5 rounded-full inline-block`
}
function fmt(n: number, decimals = 2) {
  return n.toFixed(decimals)
}
function fmtPct(n: number) {
  return `${n.toFixed(1)}%`
}
function fmtUSD(n: number) {
  return `$${n.toFixed(2)}`
}

// ── Metric card ──────────────────────────────────────────────────────────────
function MetricCard({ label, value, sub, color = 'gray' }: {
  label: string; value: string; sub?: string; color?: string
}) {
  return (
    <div className={metricClass(color)}>
      <p className="text-xs mb-1 opacity-80">{label}</p>
      <p className="text-xl font-medium">{value}</p>
      {sub && <p className="text-xs opacity-70 mt-0.5">{sub}</p>}
    </div>
  )
}

// ── Upload zone ──────────────────────────────────────────────────────────────
function UploadZone({ label, name, accept, multiple, files, onFiles }: {
  label: string; name: string; accept: string; multiple?: boolean
  files: File[]; onFiles: (f: File[]) => void
}) {
  return (
    <label className="flex flex-col items-center gap-2 border border-dashed border-gray-300 rounded-xl p-4 cursor-pointer hover:border-gray-400 transition-colors bg-white">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <span className="text-xs text-gray-400">
        {files.length > 0 ? `${files.length} archivo(s) cargado(s)` : `Clic para subir ${accept}`}
      </span>
      <input
        type="file"
        name={name}
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={e => onFiles(Array.from(e.target.files || []))}
      />
    </label>
  )
}

// ── Delivery pie chart ───────────────────────────────────────────────────────
function DeliveryPie({ delivered, inTransit, returned, pending, notConfirmed }: {
  delivered: number; inTransit: number; returned: number; pending: number; notConfirmed: number
}) {
  const data = [
    { name: 'Entregados', value: delivered, color: '#639922' },
    { name: 'En tránsito', value: inTransit, color: '#378ADD' },
    { name: 'Devueltos', value: returned, color: '#E24B4A' },
    { name: 'Pendientes', value: pending, color: '#EF9F27' },
    { name: 'No confirmados', value: notConfirmed, color: '#888780' }
  ].filter(d => d.value > 0)

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
          {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
        </Pie>
        <Tooltip formatter={(v: number) => [`${v} pedidos`]} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  )
}

// ── Product detail view ──────────────────────────────────────────────────────
function ProductDetail({ m, onBack }: { m: ProductMetrics; onBack: () => void }) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <button onClick={onBack} className="text-sm text-gray-400 hover:text-gray-600 flex items-center gap-1">
          ← volver
        </button>
        <h2 className="text-lg font-medium text-gray-900">{m.product}</h2>
      </div>

      {/* Shopify */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-medium px-3 py-1 rounded-full bg-[#E1F5EE] text-[#0F6E56]">Shopify</span>
        </div>
        <div className="grid grid-cols-5 gap-2 mb-4">
          <MetricCard label="Pedidos Shopify" value={String(m.shopifyOrders)} color="gray" />
          <MetricCard label="CPA" value={fmtUSD(m.shopifyCPA)} color={colorCPA(m.shopifyCPA)} />
          <MetricCard label="Despachos" value={String(m.shopifyDispatched)} color="gray" />
          <MetricCard label="% Confirmación" value={fmtPct(m.shopifyConfirmRate)} color={colorConfirmRate(m.shopifyConfirmRate)} />
          <MetricCard label="CPA Real" value={fmtUSD(m.shopifyCPAReal)} color={colorCPAReal(m.shopifyCPAReal)} />
        </div>
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-gray-50">
              <tr>{['Gasto Ads','Pedidos','Despachos','% Confirm.','CPA','CPA Real'].map(h =>
                <th key={h} className="text-left px-3 py-2 text-gray-400 font-medium uppercase tracking-wide text-[10px]">{h}</th>
              )}</tr>
            </thead>
            <tbody>
              <tr className="border-t border-gray-50">
                <td className="px-3 py-2">{fmtUSD(m.shopifySpend)}</td>
                <td className="px-3 py-2">{m.shopifyOrders}</td>
                <td className="px-3 py-2">{m.shopifyDispatched}</td>
                <td className="px-3 py-2"><span className={pillClass(colorConfirmRate(m.shopifyConfirmRate))}>{fmtPct(m.shopifyConfirmRate)}</span></td>
                <td className="px-3 py-2"><span className={pillClass(colorCPA(m.shopifyCPA))}>{fmtUSD(m.shopifyCPA)}</span></td>
                <td className="px-3 py-2"><span className={pillClass(colorCPAReal(m.shopifyCPAReal))}>{fmtUSD(m.shopifyCPAReal)}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* WhatsApp */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-medium px-3 py-1 rounded-full bg-[#EEEDFE] text-[#3C3489]">WhatsApp</span>
        </div>
        <div className="grid grid-cols-4 gap-2 mb-4">
          <MetricCard label="Costo / conversación" value={fmtUSD(m.whatsCAC)} color={colorCostPerConv(m.whatsCAC)} />
          <MetricCard label="Despachos" value={String(m.whatsDispatched)} color="gray" />
          <MetricCard label="CPA Real" value={fmtUSD(m.whatsCPAReal)} color={colorCPAReal(m.whatsCPAReal)} />
          <MetricCard label="% Cierre" value={fmtPct(m.whatsCloseRate)} color={colorCloseRate(m.whatsCloseRate)} />
        </div>
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-gray-50">
              <tr>{['Gasto Ads','Conversaciones','Costo/Conv.','Despachos','CPA Real','% Cierre'].map(h =>
                <th key={h} className="text-left px-3 py-2 text-gray-400 font-medium uppercase tracking-wide text-[10px]">{h}</th>
              )}</tr>
            </thead>
            <tbody>
              <tr className="border-t border-gray-50">
                <td className="px-3 py-2">{fmtUSD(m.whatsSpend)}</td>
                <td className="px-3 py-2">{m.whatsConversations}</td>
                <td className="px-3 py-2"><span className={pillClass(colorCostPerConv(m.whatsCAC))}>{fmtUSD(m.whatsCAC)}</span></td>
                <td className="px-3 py-2">{m.whatsDispatched}</td>
                <td className="px-3 py-2"><span className={pillClass(colorCPAReal(m.whatsCPAReal))}>{fmtUSD(m.whatsCPAReal)}</span></td>
                <td className="px-3 py-2"><span className={pillClass(colorCloseRate(m.whatsCloseRate))}>{fmtPct(m.whatsCloseRate)}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Logística */}
      <div className="mb-6">
        <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Logística y entregas</h3>
        <div className="grid grid-cols-2 gap-6">
          <div className="grid grid-cols-2 gap-2">
            <MetricCard label="Total pedidos" value={String(m.totalOrders)} color="gray" />
            <MetricCard label="Entregados" value={String(m.delivered)} color="green" />
            <MetricCard label="En tránsito" value={String(m.inTransit)} color="blue" />
            <MetricCard label="Devueltos" value={String(m.returned)} color="red" />
            <MetricCard label="Pendientes" value={String(m.pending)} color="yellow" />
            <MetricCard label="% Entrega" value={fmtPct(m.deliveryRate)} color={m.deliveryRate >= 70 ? 'green' : m.deliveryRate >= 50 ? 'yellow' : 'red'} />
          </div>
          <DeliveryPie
            delivered={m.delivered} inTransit={m.inTransit}
            returned={m.returned} pending={m.pending} notConfirmed={m.notConfirmed}
          />
        </div>
      </div>

      {/* Rentabilidad */}
      <div>
        <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Rentabilidad</h3>
        <div className="grid grid-cols-4 gap-2 mb-3">
          <MetricCard label="Recaudo" value={fmtUSD(m.revenue)} color="gray" />
          <MetricCard label="Costo producto" value={fmtUSD(m.productCost)} color="gray" />
          <MetricCard label="Flete entregados" value={fmtUSD(m.shippingCostDelivered)} color="gray" />
          <MetricCard label="Flete devueltos" value={fmtUSD(m.shippingCostReturned)} color="gray" />
        </div>
        <div className="grid grid-cols-4 gap-2">
          <MetricCard label="Fulfillment ($0.85/u)" value={fmtUSD(m.fulfillment)} color="gray" />
          <MetricCard label="Gasto Ads" value={fmtUSD(m.totalAdSpend)} color="gray" />
          <MetricCard label="Profit neto" value={fmtUSD(m.netProfit)} color={m.netProfit >= 0 ? 'green' : 'red'} />
          <MetricCard label="ROI" value={fmt(m.roi, 3)} color={m.roi >= 0 ? 'green' : 'red'} />
        </div>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <MetricCard label="Margen neto" value={fmtPct(m.netMargin)} color={m.netMargin >= 15 ? 'green' : m.netMargin >= 0 ? 'yellow' : 'red'} />
        </div>
      </div>
    </div>
  )
}

// ── General view ─────────────────────────────────────────────────────────────
function GeneralView({ metrics, adminCosts, onAdminChange, onSelectProduct }: {
  metrics: GeneralMetrics
  adminCosts: { payroll: number; tools: number }
  onAdminChange: (k: 'payroll' | 'tools', v: number) => void
  onSelectProduct: (p: ProductMetrics) => void
}) {
  const totalShopifyOrders = metrics.products.reduce((s, p) => s + p.shopifyOrders, 0)
  const totalShopifyDispatched = metrics.products.reduce((s, p) => s + p.shopifyDispatched, 0)
  const totalShopifySpend = metrics.products.reduce((s, p) => s + p.shopifySpend, 0)
  const avgConfirm = totalShopifyOrders > 0 ? (totalShopifyDispatched / totalShopifyOrders) * 100 : 0
  const avgCPA = totalShopifyOrders > 0 ? totalShopifySpend / totalShopifyOrders : 0
  const avgCPAReal = totalShopifyDispatched > 0 ? totalShopifySpend / totalShopifyDispatched : 0

  const totalWhatsConvs = metrics.products.reduce((s, p) => s + p.whatsConversations, 0)
  const totalWhatsDispatched = metrics.products.reduce((s, p) => s + p.whatsDispatched, 0)
  const totalWhatsSpend = metrics.products.reduce((s, p) => s + p.whatsSpend, 0)
  const avgCAC = totalWhatsConvs > 0 ? totalWhatsSpend / totalWhatsConvs : 0
  const avgWhatsCPAReal = totalWhatsDispatched > 0 ? totalWhatsSpend / totalWhatsDispatched : 0
  const avgCloseRate = totalWhatsConvs > 0 ? (totalWhatsDispatched / totalWhatsConvs) * 100 : 0

  return (
    <div>
      {/* Legend */}
      <div className="flex gap-4 mb-5 text-xs">
        <span className="font-medium text-gray-400">Referencia:</span>
        {[['#639922','Verde — Excelente'],['#378ADD','Azul — Óptimo'],['#EF9F27','Amarillo — Atención'],['#E24B4A','Rojo — Crítico']].map(([c,l]) => (
          <span key={l} className="flex items-center gap-1.5 text-gray-600">
            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{background: c}}></span>{l}
          </span>
        ))}
      </div>

      {/* Shopify */}
      <div className="mb-6">
        <span className="text-xs font-medium px-3 py-1 rounded-full bg-[#E1F5EE] text-[#0F6E56] mb-3 inline-block">Shopify</span>
        <div className="grid grid-cols-5 gap-2">
          <MetricCard label="Pedidos" value={String(totalShopifyOrders)} color="gray" />
          <MetricCard label="CPA" value={fmtUSD(avgCPA)} color={colorCPA(avgCPA)} />
          <MetricCard label="Despachos" value={String(totalShopifyDispatched)} color="gray" />
          <MetricCard label="% Confirmación" value={fmtPct(avgConfirm)} color={colorConfirmRate(avgConfirm)} />
          <MetricCard label="CPA Real" value={fmtUSD(avgCPAReal)} color={colorCPAReal(avgCPAReal)} />
        </div>
      </div>

      {/* WhatsApp */}
      <div className="mb-6">
        <span className="text-xs font-medium px-3 py-1 rounded-full bg-[#EEEDFE] text-[#3C3489] mb-3 inline-block">WhatsApp</span>
        <div className="grid grid-cols-4 gap-2">
          <MetricCard label="Costo / conversación" value={fmtUSD(avgCAC)} color={colorCostPerConv(avgCAC)} />
          <MetricCard label="Despachos" value={String(totalWhatsDispatched)} color="gray" />
          <MetricCard label="CPA Real" value={fmtUSD(avgWhatsCPAReal)} color={colorCPAReal(avgWhatsCPAReal)} />
          <MetricCard label="% Cierre" value={fmtPct(avgCloseRate)} color={colorCloseRate(avgCloseRate)} />
        </div>
      </div>

      <hr className="border-gray-100 my-5" />

      {/* Por producto */}
      <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Por producto</h3>
      <div className="grid grid-cols-3 gap-3 mb-6">
        {metrics.products.map(p => (
          <button
            key={p.product}
            onClick={() => onSelectProduct(p)}
            className="text-left bg-white border border-gray-100 rounded-xl p-3 hover:border-gray-300 transition-colors"
          >
            <p className="text-sm font-medium text-gray-800 mb-2">{p.product}</p>
            <div className="grid grid-cols-2 gap-1.5">
              <div className="bg-gray-50 rounded-md p-1.5">
                <p className="text-[10px] text-gray-400">Gasto Ads</p>
                <p className="text-sm font-medium text-gray-700">{fmtUSD(p.totalAdSpend)}</p>
              </div>
              <div className={`rounded-md p-1.5 metric-${p.deliveryRate >= 70 ? 'green' : p.deliveryRate >= 50 ? 'yellow' : 'red'}`}>
                <p className="text-[10px] opacity-80">% Entrega</p>
                <p className="text-sm font-medium">{fmtPct(p.deliveryRate)}</p>
              </div>
              <div className={`rounded-md p-1.5 metric-${colorCPAReal(p.shopifyCPAReal)}`}>
                <p className="text-[10px] opacity-80">CPA Real</p>
                <p className="text-sm font-medium">{fmtUSD(p.shopifyCPAReal)}</p>
              </div>
              <div className={`rounded-md p-1.5 metric-${p.netProfit >= 0 ? 'green' : 'red'}`}>
                <p className="text-[10px] opacity-80">Profit</p>
                <p className="text-sm font-medium">{fmtUSD(p.netProfit)}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      <hr className="border-gray-100 my-5" />

      {/* Logística general */}
      <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Logística general</h3>
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="grid grid-cols-2 gap-2">
          <MetricCard label="Total pedidos" value={String(metrics.totalOrders)} color="gray" />
          <MetricCard label="Entregados" value={String(metrics.totalDelivered)} color="green" />
          <MetricCard label="En tránsito" value={String(metrics.totalInTransit)} color="blue" />
          <MetricCard label="Devueltos" value={String(metrics.totalReturned)} color="red" />
          <MetricCard label="Pendientes" value={String(metrics.totalPending)} color="yellow" />
          <MetricCard label="% Entrega" value={fmtPct(metrics.deliveryRate)} color={metrics.deliveryRate >= 70 ? 'green' : metrics.deliveryRate >= 50 ? 'yellow' : 'red'} />
        </div>
        <DeliveryPie
          delivered={metrics.totalDelivered} inTransit={metrics.totalInTransit}
          returned={metrics.totalReturned} pending={metrics.totalPending}
          notConfirmed={metrics.totalNotConfirmed}
        />
      </div>

      <hr className="border-gray-100 my-5" />

      {/* Rentabilidad general */}
      <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Rentabilidad general</h3>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="bg-white border border-gray-100 rounded-xl p-3">
          <p className="text-xs text-gray-400 mb-1">Nómina total</p>
          <input
            type="number"
            value={adminCosts.payroll}
            onChange={e => onAdminChange('payroll', parseFloat(e.target.value) || 0)}
            className="w-full text-lg font-medium text-gray-800 border-0 outline-none bg-transparent"
            placeholder="0.00"
          />
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-3">
          <p className="text-xs text-gray-400 mb-1">Herramientas / Suscripciones</p>
          <input
            type="number"
            value={adminCosts.tools}
            onChange={e => onAdminChange('tools', parseFloat(e.target.value) || 0)}
            className="w-full text-lg font-medium text-gray-800 border-0 outline-none bg-transparent"
            placeholder="0.00"
          />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2 mb-3">
        <MetricCard label="Profit neto (sin admin)" value={fmtUSD(metrics.netProfitPerProduct)} color={metrics.netProfitPerProduct >= 0 ? 'green' : 'red'} />
        <MetricCard label="Profit neto general" value={fmtUSD(metrics.netProfitGeneral)} color={metrics.netProfitGeneral >= 0 ? 'green' : 'red'} />
        <MetricCard label="Capital acumulado" value={fmtUSD(metrics.accumulatedCapital)} color={metrics.accumulatedCapital >= 0 ? 'green' : 'red'} />
        <MetricCard label="ROI general" value={fmt(metrics.roiGeneral, 3)} color={metrics.roiGeneral >= 0 ? 'green' : 'red'} />
      </div>

      <hr className="border-gray-100 my-5" />

      {/* Proyecciones */}
      <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
        Proyecciones — {metrics.totalInTransit} pedidos en tránsito
      </h3>
      <div className="grid grid-cols-4 gap-2">
        {([40,50,60,70] as const).map((rate, i) => {
          const val = [metrics.projections.rate40, metrics.projections.rate50, metrics.projections.rate60, metrics.projections.rate70][i]
          return (
            <MetricCard
              key={rate}
              label={`Si entrega ${rate}%`}
              value={fmtUSD(val)}
              color={val >= 0 ? 'green' : 'red'}
              sub={`${Math.round(metrics.totalInTransit * rate / 100)} pedidos entregados`}
            />
          )
        })}
      </div>
    </div>
  )
}

// ── Mapping modal ─────────────────────────────────────────────────────────────
function MappingModal({ mappings, onSave, onClose }: {
  mappings: ProductMapping[]
  onSave: (m: ProductMapping[]) => void
  onClose: () => void
}) {
  const [local, setLocal] = useState<ProductMapping[]>(mappings)

  function add() {
    setLocal([...local, { campaignName: '', rocketName: '' }])
  }
  function update(i: number, field: keyof ProductMapping, value: string) {
    const updated = [...local]
    updated[i] = { ...updated[i], [field]: value }
    setLocal(updated)
  }
  function remove(i: number) {
    setLocal(local.filter((_, idx) => idx !== i))
  }

  return (
    <div style={{ minHeight: 400, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 16, padding: '2rem' }}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg">
        <h3 className="text-base font-medium text-gray-800 mb-1">Mapeo de productos</h3>
        <p className="text-xs text-gray-400 mb-4">Conecta el nombre de campaña con el nombre en Rocket</p>
        <div className="space-y-2 mb-4">
          {local.map((m, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input
                placeholder="Nombre en campaña"
                value={m.campaignName}
                onChange={e => update(i, 'campaignName', e.target.value)}
                className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-gray-400"
              />
              <span className="text-gray-300">→</span>
              <input
                placeholder="Nombre en Rocket"
                value={m.rocketName}
                onChange={e => update(i, 'rocketName', e.target.value)}
                className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-gray-400"
              />
              <button onClick={() => remove(i)} className="text-gray-300 hover:text-red-400 text-lg leading-none">×</button>
            </div>
          ))}
        </div>
        <button onClick={add} className="text-xs text-blue-500 hover:text-blue-700 mb-4 block">+ Agregar mapeo</button>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="text-sm px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">Cancelar</button>
          <button onClick={() => { onSave(local); onClose() }} className="text-sm px-4 py-2 rounded-lg bg-gray-900 text-white hover:bg-gray-700">Guardar</button>
        </div>
      </div>
    </div>
  )
}

// ── Upload panel ──────────────────────────────────────────────────────────────
function UploadPanel({ onProcessed }: { onProcessed: (m: GeneralMetrics) => void }) {
  const [metaFiles, setMetaFiles] = useState<File[]>([])
  const [tiktokFiles, setTiktokFiles] = useState<File[]>([])
  const [rocketFiles, setRocketFiles] = useState<File[]>([])
  const [shopifyFiles, setShopifyFiles] = useState<File[]>([])
  const [adminCosts, setAdminCosts] = useState({ payroll: 0, tools: 0 })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [detectedMappings, setDetectedMappings] = useState<{ rocket: Record<string,string>, shopify: Record<string,string> } | null>(null)

  async function handleProcess() {
    setLoading(true)
    setError('')
    setDetectedMappings(null)
    try {
      const fd = new FormData()
      metaFiles.forEach(f => fd.append('meta', f))
      tiktokFiles.forEach(f => fd.append('tiktok', f))
      rocketFiles.forEach(f => fd.append('rocket', f))
      shopifyFiles.forEach(f => fd.append('shopify', f))
      fd.append('adminCosts', JSON.stringify(adminCosts))

      const res = await fetch('/api/process', { method: 'POST', body: fd })
      const data = await res.json()
      if (!data.ok) throw new Error(data.error)
      if (data.mappings) setDetectedMappings(data.mappings)
      onProcessed(data.metrics)
      fetch('/api/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ metrics: data.metrics }) }).catch(() => {})
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <h1 className="text-xl font-medium text-gray-800 mb-1">Ops Dashboard</h1>
      <p className="text-sm text-gray-400 mb-6">Sube los reportes para calcular tus métricas</p>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <UploadZone label="Meta Ads (.xlsx)" name="meta" accept=".xlsx" multiple files={metaFiles} onFiles={setMetaFiles} />
        <UploadZone label="TikTok Ads (.xlsx)" name="tiktok" accept=".xlsx" multiple files={tiktokFiles} onFiles={setTiktokFiles} />
        <UploadZone label="Rocket (.xlsx) — puede subir varios" name="rocket" accept=".xlsx" multiple files={rocketFiles} onFiles={setRocketFiles} />
        <UploadZone label="Shopify (.csv)" name="shopify" accept=".csv" multiple files={shopifyFiles} onFiles={setShopifyFiles} />
      </div>

      {detectedMappings && (
        <div className="mb-6 bg-white border border-gray-100 rounded-xl p-4">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Mapeos detectados automáticamente</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-gray-600 mb-2">Rocket → Campaña</p>
              {Object.entries(detectedMappings.rocket).map(([k, v]) => (
                <div key={k} className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                  <span className="bg-gray-50 rounded px-2 py-0.5 truncate max-w-[140px]">{k}</span>
                  <span className="text-gray-300">→</span>
                  <span className="text-gray-700 font-medium truncate max-w-[140px]">{v}</span>
                </div>
              ))}
            </div>
            <div>
              <p className="text-xs font-medium text-gray-600 mb-2">Shopify → Campaña</p>
              {Object.entries(detectedMappings.shopify).map(([k, v]) => (
                <div key={k} className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                  <span className="bg-gray-50 rounded px-2 py-0.5 truncate max-w-[140px]">{k}</span>
                  <span className="text-gray-300">→</span>
                  <span className="text-gray-700 font-medium truncate max-w-[140px]">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

      <button
        onClick={handleProcess}
        disabled={loading}
        className="w-full py-3 rounded-xl bg-gray-900 text-white font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors"
      >
        {loading ? 'Procesando...' : 'Calcular métricas →'}
      </button>
    </div>
  )
}

// ── Root page ─────────────────────────────────────────────────────────────────
export default function Page() {
  const [metrics, setMetrics] = useState<GeneralMetrics | null>(null)
  const [activeProduct, setActiveProduct] = useState<ProductMetrics | null>(null)
  const [adminCosts, setAdminCosts] = useState({ payroll: 0, tools: 0 })
  const [showUpload, setShowUpload] = useState(false)

  function handleAdminChange(k: 'payroll' | 'tools', v: number) {
    setAdminCosts(prev => ({ ...prev, [k]: v }))
  }

  if (!metrics || showUpload) {
    return (
      <div className="min-h-screen bg-[#f8f7f4]">
        <UploadPanel onProcessed={m => { setMetrics(m); setShowUpload(false) }} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f8f7f4]">
      <div className="max-w-5xl mx-auto px-6 py-6">

        {/* Topbar */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-800 bg-white border border-gray-100 rounded-lg px-3 py-1.5">
              📊 Ops Dashboard
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowUpload(true)}
              className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-white"
            >
              ↑ Subir reportes
            </button>
          </div>
        </div>

        {/* Nav por producto */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 overflow-x-auto">
          <button
            onClick={() => setActiveProduct(null)}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${!activeProduct ? 'bg-white text-gray-800 border border-gray-100' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Resumen general
          </button>
          {metrics.products.map(p => (
            <button
              key={p.product}
              onClick={() => setActiveProduct(p)}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${activeProduct?.product === p.product ? 'bg-white text-gray-800 border border-gray-100' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {p.product}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          {activeProduct ? (
            <ProductDetail m={activeProduct} onBack={() => setActiveProduct(null)} />
          ) : (
            <GeneralView
              metrics={metrics}
              adminCosts={adminCosts}
              onAdminChange={handleAdminChange}
              onSelectProduct={setActiveProduct}
            />
          )}
        </div>
      </div>
    </div>
  )
}
