'use client'
import { useState } from 'react'
import { GeneralMetrics, ProductMetrics, CarrierStats } from '@/lib/types'
import { colorCPA, colorConfirmRate, colorCPAReal, colorCostPerConv, colorCloseRate } from '@/lib/metrics'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'

function metricClass(color: string) { return `metric-${color} rounded-lg p-3` }
function pillClass(color: string) { return `pill-${color} text-xs font-medium px-2 py-0.5 rounded-full inline-block` }
function fmtUSD(n: number) { return n === 0 ? '—' : `$${n.toFixed(2)}` }
function fmtPct(n: number) { return `${n.toFixed(1)}%` }
function fmt(n: number, d = 2) { return n.toFixed(d) }

function MetricCard({ label, value, sub, color = 'gray' }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className={metricClass(color)}>
      <p className="text-xs mb-1 opacity-80">{label}</p>
      <p className="text-xl font-medium">{value}</p>
      {sub && <p className="text-xs opacity-70 mt-0.5">{sub}</p>}
    </div>
  )
}

function UploadZone({ label, accept, multiple, files, onFiles }: { label: string; accept: string; multiple?: boolean; files: File[]; onFiles: (f: File[]) => void }) {
  return (
    <label className="flex flex-col items-center gap-2 border border-dashed border-gray-300 rounded-xl p-4 cursor-pointer hover:border-gray-400 transition-colors bg-white">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <span className="text-xs text-gray-400">{files.length > 0 ? `${files.length} archivo(s) cargado(s)` : `Clic para subir`}</span>
      <input type="file" accept={accept} multiple={multiple} className="hidden" onChange={e => onFiles(Array.from(e.target.files || []))} />
    </label>
  )
}

function DeliveryPie({ delivered, inTransit, returned }: { delivered: number; inTransit: number; returned: number }) {
  const total = delivered + inTransit + returned
  if (total === 0) return <div className="flex items-center justify-center h-[220px] text-gray-300 text-sm">Sin datos</div>
  const data = [
    { name: 'Entregados', value: delivered, color: '#639922', pct: total > 0 ? (delivered/total*100).toFixed(1) : '0' },
    { name: 'En tránsito', value: inTransit, color: '#378ADD', pct: total > 0 ? (inTransit/total*100).toFixed(1) : '0' },
    { name: 'Devueltos', value: returned, color: '#E24B4A', pct: total > 0 ? (returned/total*100).toFixed(1) : '0' },
  ].filter(d => d.value > 0)
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} label={({ name, pct }) => `${name} ${pct}%`} labelLine={true} fontSize={11}>
          {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
        </Pie>
        <Tooltip formatter={(v: number, name: string) => [`${v} pedidos (${data.find(d=>d.name===name)?.pct}%)`, name]} />
      </PieChart>
    </ResponsiveContainer>
  )
}

function CarrierSection({ carrierStats }: { carrierStats: CarrierStats }) {
  const carriers = Object.entries(carrierStats).filter(([, s]) => s.dispatched > 0)
  if (carriers.length === 0) return null
  return (
    <div className="mt-4">
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Por transportadora</p>
      <div className="grid grid-cols-2 gap-2">
        {carriers.map(([carrier, stats]) => {
          const rate = stats.dispatched > 0 ? (stats.delivered / stats.dispatched * 100) : 0
          return (
            <div key={carrier} className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm font-medium text-gray-700">{carrier}</p>
              <div className="flex gap-3 mt-1 text-xs text-gray-500">
                <span>{stats.dispatched} despachados</span>
                <span>{stats.delivered} entregados</span>
                <span className={`font-medium ${rate >= 70 ? 'text-green-700' : rate >= 50 ? 'text-yellow-700' : 'text-red-700'}`}>{rate.toFixed(1)}%</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Filters bar
function FiltersBar({ products, filters, onChange }: {
  products: string[]
  filters: { product: string; channel: string; carrier: string; dateFrom: string; dateTo: string }
  onChange: (f: typeof filters) => void
}) {
  return (
    <div className="flex flex-wrap gap-2 mb-5 p-3 bg-gray-50 rounded-xl">
      <select value={filters.product} onChange={e => onChange({...filters, product: e.target.value})}
        className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 outline-none">
        <option value="">Todos los productos</option>
        {products.map(p => <option key={p} value={p}>{p}</option>)}
      </select>
      <select value={filters.channel} onChange={e => onChange({...filters, channel: e.target.value})}
        className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 outline-none">
        <option value="">Todos los canales</option>
        <option value="shopify">Shopify</option>
        <option value="whatsapp">WhatsApp</option>
      </select>
      <select value={filters.carrier} onChange={e => onChange({...filters, carrier: e.target.value})}
        className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 outline-none">
        <option value="">Todas las transportadoras</option>
        <option value="Servientrega">Servientrega</option>
        <option value="Gintracom">Gintracom</option>
      </select>
      <input type="date" value={filters.dateFrom} onChange={e => onChange({...filters, dateFrom: e.target.value})}
        className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 outline-none" />
      <input type="date" value={filters.dateTo} onChange={e => onChange({...filters, dateTo: e.target.value})}
        className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 outline-none" />
      {(filters.product || filters.channel || filters.carrier || filters.dateFrom || filters.dateTo) && (
        <button onClick={() => onChange({ product: '', channel: '', carrier: '', dateFrom: '', dateTo: '' })}
          className="text-xs text-gray-400 hover:text-gray-600 px-2">✕ Limpiar</button>
      )}
    </div>
  )
}

function applyFilters(metrics: GeneralMetrics, filters: { product: string; channel: string; carrier: string; dateFrom: string; dateTo: string }): GeneralMetrics {
  let products = [...metrics.products]
  if (filters.product) products = products.filter(p => p.product === filters.product)
  if (filters.carrier) {
    products = products.map(p => ({
      ...p,
      carrierStats: Object.fromEntries(Object.entries(p.carrierStats).filter(([c]) => c === filters.carrier)),
      delivered: filters.carrier ? (p.carrierStats[filters.carrier]?.delivered || 0) : p.delivered,
      inTransit: p.inTransit,
      returned: p.returned
    }))
  }
  // Channel filter: show only relevant metrics
  return { ...metrics, products }
}

function ProductDetail({ m, onBack }: { m: ProductMetrics; onBack: () => void }) {
  const [filters, setFilters] = useState({ product: '', channel: '', carrier: '', dateFrom: '', dateTo: '' })
  const showShopify = !filters.channel || filters.channel === 'shopify'
  const showWhats = !filters.channel || filters.channel === 'whatsapp'

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onBack} className="text-sm text-gray-400 hover:text-gray-600">← volver</button>
        <h2 className="text-lg font-medium text-gray-900">{m.product}</h2>
      </div>

      <FiltersBar products={[]} filters={filters} onChange={setFilters} />

      {showShopify && (
        <div className="mb-6">
          <span className="text-xs font-medium px-3 py-1 rounded-full bg-[#E1F5EE] text-[#0F6E56] mb-3 inline-block">Shopify</span>
          <div className="grid grid-cols-5 gap-2 mb-3">
            <MetricCard label="Pedidos" value={String(m.shopifyOrders)} color="gray" />
            <MetricCard label="CPA" value={fmtUSD(m.shopifyCPA)} color={colorCPA(m.shopifyCPA)} />
            <MetricCard label="Despachos" value={String(m.shopifyDispatched)} color="gray" />
            <MetricCard label="% Confirmación" value={fmtPct(m.shopifyConfirmRate)} color={colorConfirmRate(m.shopifyConfirmRate)} />
            <MetricCard label="CPA Real" value={fmtUSD(m.shopifyCPAReal)} color={colorCPAReal(m.shopifyCPAReal)} />
          </div>
        </div>
      )}

      {showWhats && (
        <div className="mb-6">
          <span className="text-xs font-medium px-3 py-1 rounded-full bg-[#EEEDFE] text-[#3C3489] mb-3 inline-block">WhatsApp</span>
          <div className="grid grid-cols-4 gap-2">
            <MetricCard label="Costo / conversación" value={fmtUSD(m.whatsCAC)} color={colorCostPerConv(m.whatsCAC)} />
            <MetricCard label="Despachos" value={String(m.whatsDispatched)} color="gray" />
            <MetricCard label="CPA Real" value={fmtUSD(m.whatsCPAReal)} color={colorCPAReal(m.whatsCPAReal)} />
            <MetricCard label="% Cierre" value={fmtPct(m.whatsCloseRate)} color={colorCloseRate(m.whatsCloseRate)} />
          </div>
        </div>
      )}

      <hr className="border-gray-100 my-4" />
      <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Logística y entregas</h3>
      <div className="grid grid-cols-2 gap-6 mb-4">
        <div className="grid grid-cols-2 gap-2">
          <MetricCard label="Entregados" value={String(m.delivered)} color="green" />
          <MetricCard label="En tránsito" value={String(m.inTransit)} color="blue" />
          <MetricCard label="Devueltos" value={String(m.returned)} color="red" />
          <MetricCard label="% Entrega" value={fmtPct(m.deliveryRate)} color={m.deliveryRate >= 70 ? 'green' : m.deliveryRate >= 50 ? 'yellow' : 'red'} />
        </div>
        <DeliveryPie delivered={m.delivered} inTransit={m.inTransit} returned={m.returned} />
      </div>
      <CarrierSection carrierStats={m.carrierStats} />

      <hr className="border-gray-100 my-4" />
      <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Rentabilidad</h3>
      <div className="grid grid-cols-4 gap-2 mb-2">
        <MetricCard label="Recaudo" value={fmtUSD(m.revenue)} color="gray" />
        <MetricCard label="Costo producto" value={fmtUSD(m.productCost)} color="gray" />
        <MetricCard label="Flete entregados" value={fmtUSD(m.shippingCostDelivered)} color="gray" />
        <MetricCard label="Flete devueltos" value={fmtUSD(m.shippingCostReturned)} color="gray" />
      </div>
      <div className="grid grid-cols-4 gap-2">
        <MetricCard label="Fulfillment" value={fmtUSD(m.fulfillment)} color="gray" />
        <MetricCard label="Gasto Ads" value={fmtUSD(m.totalAdSpend)} color="gray" />
        <MetricCard label="Profit neto" value={fmtUSD(m.netProfit)} color={m.netProfit >= 0 ? 'green' : 'red'} />
        <MetricCard label="ROI" value={fmt(m.roi, 3)} color={m.roi >= 0 ? 'green' : 'red'} />
      </div>
      <div className="grid grid-cols-2 gap-2 mt-2">
        <MetricCard label="Margen neto" value={fmtPct(m.netMargin)} color={m.netMargin >= 15 ? 'green' : m.netMargin >= 0 ? 'yellow' : 'red'} />
      </div>
    </div>
  )
}

function GeneralView({ metrics, adminCosts, onAdminChange, onSelectProduct }: {
  metrics: GeneralMetrics
  adminCosts: { payroll: number; tools: number }
  onAdminChange: (k: 'payroll' | 'tools', v: number) => void
  onSelectProduct: (p: ProductMetrics) => void
}) {
  const [filters, setFilters] = useState({ product: '', channel: '', carrier: '', dateFrom: '', dateTo: '' })
  const filtered = applyFilters(metrics, filters)
  const products = filtered.products

  const totalShopifyOrders = products.reduce((s, p) => s + p.shopifyOrders, 0)
  const totalShopifyDispatched = products.reduce((s, p) => s + p.shopifyDispatched, 0)
  const totalShopifySpend = products.reduce((s, p) => s + p.shopifySpend, 0)
  const avgConfirm = totalShopifyOrders > 0 ? (totalShopifyDispatched / totalShopifyOrders) * 100 : 0
  const avgCPA = totalShopifyOrders > 0 ? totalShopifySpend / totalShopifyOrders : 0
  const avgCPAReal = totalShopifyDispatched > 0 ? totalShopifySpend / totalShopifyDispatched : 0
  const totalWhatsConvs = products.reduce((s, p) => s + p.whatsConversations, 0)
  const totalWhatsDispatched = products.reduce((s, p) => s + p.whatsDispatched, 0)
  const totalWhatsSpend = products.reduce((s, p) => s + p.whatsSpend, 0)
  const avgCAC = totalWhatsConvs > 0 ? totalWhatsSpend / totalWhatsConvs : 0
  const avgWhatsCPAReal = totalWhatsDispatched > 0 ? totalWhatsSpend / totalWhatsDispatched : 0
  const avgCloseRate = totalWhatsConvs > 0 ? (totalWhatsDispatched / totalWhatsConvs) * 100 : 0
  const totalDelivered = products.reduce((s, p) => s + p.delivered, 0)
  const totalInTransit = products.reduce((s, p) => s + p.inTransit, 0)
  const totalReturned = products.reduce((s, p) => s + p.returned, 0)
  const allDispatched = totalDelivered + totalInTransit + totalReturned
  const deliveryRate = allDispatched > 0 ? (totalDelivered / allDispatched) * 100 : 0

  const showShopify = !filters.channel || filters.channel === 'shopify'
  const showWhats = !filters.channel || filters.channel === 'whatsapp'

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-4 text-xs">
        {[['#639922','Verde — Excelente'],['#378ADD','Azul — Óptimo'],['#EF9F27','Amarillo — Atención'],['#E24B4A','Rojo — Crítico']].map(([c,l]) => (
          <span key={l} className="flex items-center gap-1.5 text-gray-600">
            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{background: c}}></span>{l}
          </span>
        ))}
      </div>

      <FiltersBar products={metrics.products.map(p => p.product)} filters={filters} onChange={setFilters} />

      {showShopify && (
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
      )}

      {showWhats && (
        <div className="mb-6">
          <span className="text-xs font-medium px-3 py-1 rounded-full bg-[#EEEDFE] text-[#3C3489] mb-3 inline-block">WhatsApp</span>
          <div className="grid grid-cols-4 gap-2">
            <MetricCard label="Costo / conversación" value={fmtUSD(avgCAC)} color={colorCostPerConv(avgCAC)} />
            <MetricCard label="Despachos" value={String(totalWhatsDispatched)} color="gray" />
            <MetricCard label="CPA Real" value={fmtUSD(avgWhatsCPAReal)} color={colorCPAReal(avgWhatsCPAReal)} />
            <MetricCard label="% Cierre" value={fmtPct(avgCloseRate)} color={colorCloseRate(avgCloseRate)} />
          </div>
        </div>
      )}

      <hr className="border-gray-100 my-4" />
      <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Por producto</h3>
      <div className="grid grid-cols-3 gap-3 mb-6">
        {products.map(p => (
          <button key={p.product} onClick={() => onSelectProduct(p)}
            className="text-left bg-white border border-gray-100 rounded-xl p-3 hover:border-gray-300 transition-colors">
            <p className="text-sm font-medium text-gray-800 mb-2">{p.product}</p>
            <div className="grid grid-cols-2 gap-1.5">
              <div className="bg-gray-50 rounded-md p-1.5"><p className="text-[10px] text-gray-400">Gasto Ads</p><p className="text-sm font-medium text-gray-700">{fmtUSD(p.totalAdSpend)}</p></div>
              <div className={`rounded-md p-1.5 metric-${p.deliveryRate >= 70 ? 'green' : p.deliveryRate >= 50 ? 'yellow' : 'red'}`}><p className="text-[10px] opacity-80">% Entrega</p><p className="text-sm font-medium">{fmtPct(p.deliveryRate)}</p></div>
              <div className={`rounded-md p-1.5 metric-${colorCPAReal(p.shopifyCPAReal)}`}><p className="text-[10px] opacity-80">CPA Real</p><p className="text-sm font-medium">{fmtUSD(p.shopifyCPAReal)}</p></div>
              <div className={`rounded-md p-1.5 metric-${p.netProfit >= 0 ? 'green' : 'red'}`}><p className="text-[10px] opacity-80">Profit</p><p className="text-sm font-medium">{fmtUSD(p.netProfit)}</p></div>
            </div>
          </button>
        ))}
      </div>

      <hr className="border-gray-100 my-4" />
      <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Logística general</h3>
      <div className="grid grid-cols-2 gap-6 mb-4">
        <div className="grid grid-cols-2 gap-2">
          <MetricCard label="Entregados" value={String(totalDelivered)} color="green" />
          <MetricCard label="En tránsito" value={String(totalInTransit)} color="blue" />
          <MetricCard label="Devueltos" value={String(totalReturned)} color="red" />
          <MetricCard label="% Entrega" value={fmtPct(deliveryRate)} color={deliveryRate >= 70 ? 'green' : deliveryRate >= 50 ? 'yellow' : 'red'} />
        </div>
        <DeliveryPie delivered={totalDelivered} inTransit={totalInTransit} returned={totalReturned} />
      </div>
      <CarrierSection carrierStats={filtered.carrierStats} />

      <hr className="border-gray-100 my-4" />
      <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Rentabilidad general</h3>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="bg-white border border-gray-100 rounded-xl p-3">
          <p className="text-xs text-gray-400 mb-1">Nómina total</p>
          <input type="number" value={adminCosts.payroll} onChange={e => onAdminChange('payroll', parseFloat(e.target.value) || 0)}
            className="w-full text-lg font-medium text-gray-800 border-0 outline-none bg-transparent" placeholder="0.00" />
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-3">
          <p className="text-xs text-gray-400 mb-1">Herramientas / Suscripciones</p>
          <input type="number" value={adminCosts.tools} onChange={e => onAdminChange('tools', parseFloat(e.target.value) || 0)}
            className="w-full text-lg font-medium text-gray-800 border-0 outline-none bg-transparent" placeholder="0.00" />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2 mb-2">
        <MetricCard label="Profit neto (sin admin)" value={fmtUSD(filtered.netProfitPerProduct)} color={filtered.netProfitPerProduct >= 0 ? 'green' : 'red'} />
        <MetricCard label="Profit neto general" value={fmtUSD(filtered.netProfitGeneral)} color={filtered.netProfitGeneral >= 0 ? 'green' : 'red'} />
        <MetricCard label="Capital acumulado" value={fmtUSD(filtered.accumulatedCapital)} color={filtered.accumulatedCapital >= 0 ? 'green' : 'red'} />
        <MetricCard label="ROI general" value={fmt(filtered.roiGeneral, 3)} color={filtered.roiGeneral >= 0 ? 'green' : 'red'} />
      </div>

      <hr className="border-gray-100 my-4" />
      <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Proyecciones — {filtered.totalInTransit} pedidos en tránsito</h3>
      <div className="grid grid-cols-4 gap-2">
        {([40,50,60,70] as const).map((rate, i) => {
          const val = [filtered.projections.rate40, filtered.projections.rate50, filtered.projections.rate60, filtered.projections.rate70][i]
          return <MetricCard key={rate} label={`Si entrega ${rate}%`} value={fmtUSD(val)} color={val >= 0 ? 'green' : 'red'} sub={`${Math.round(filtered.totalInTransit * rate/100)} pedidos`} />
        })}
      </div>
    </div>
  )
}

function UploadPanel({ onProcessed }: { onProcessed: (m: GeneralMetrics) => void }) {
  const [metaFiles, setMetaFiles] = useState<File[]>([])
  const [tiktokFiles, setTiktokFiles] = useState<File[]>([])
  const [rocketFiles, setRocketFiles] = useState<File[]>([])
  const [shopifyFiles, setShopifyFiles] = useState<File[]>([])
  const [mappingFiles, setMappingFiles] = useState<File[]>([])
  const [adminCosts] = useState({ payroll: 0, tools: 0 })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleProcess() {
    setLoading(true); setError('')
    try {
      const fd = new FormData()
      metaFiles.forEach(f => fd.append('meta', f))
      tiktokFiles.forEach(f => fd.append('tiktok', f))
      rocketFiles.forEach(f => fd.append('rocket', f))
      shopifyFiles.forEach(f => fd.append('shopify', f))
      mappingFiles.forEach(f => fd.append('mappings', f))
      fd.append('adminCosts', JSON.stringify(adminCosts))
      const res = await fetch('/api/process', { method: 'POST', body: fd })
      const data = await res.json()
      if (!data.ok) throw new Error(data.error)
      onProcessed(data.metrics)
      fetch('/api/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ metrics: data.metrics }) }).catch(() => {})
    } catch (e) { setError(String(e)) } finally { setLoading(false) }
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <h1 className="text-xl font-medium text-gray-800 mb-1">Ops Dashboard</h1>
      <p className="text-sm text-gray-400 mb-6">Sube los reportes para calcular tus métricas</p>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <UploadZone label="Meta Ads (.xlsx)" accept=".xlsx" multiple files={metaFiles} onFiles={setMetaFiles} />
        <UploadZone label="TikTok Ads (.xlsx)" accept=".xlsx" multiple files={tiktokFiles} onFiles={setTiktokFiles} />
        <UploadZone label="Rocket (.xlsx) — puede subir varios" accept=".xlsx" multiple files={rocketFiles} onFiles={setRocketFiles} />
        <UploadZone label="Shopify pedidos (.csv)" accept=".csv" multiple files={shopifyFiles} onFiles={setShopifyFiles} />
      </div>
      <div className="mb-6">
        <UploadZone label="Mapeo de productos (.csv) — opcional pero recomendado" accept=".csv" files={mappingFiles} onFiles={setMappingFiles} />
        {mappingFiles.length === 0 && (
          <p className="text-xs text-gray-400 mt-2 text-center">
            El CSV debe tener columnas: <code className="bg-gray-100 px-1 rounded">campaña,rocket,shopify</code>
          </p>
        )}
      </div>
      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
      <button onClick={handleProcess} disabled={loading}
        className="w-full py-3 rounded-xl bg-gray-900 text-white font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors">
        {loading ? 'Procesando...' : 'Calcular métricas →'}
      </button>
    </div>
  )
}

export default function Page() {
  const [metrics, setMetrics] = useState<GeneralMetrics | null>(null)
  const [activeProduct, setActiveProduct] = useState<ProductMetrics | null>(null)
  const [adminCosts, setAdminCosts] = useState({ payroll: 0, tools: 0 })
  const [showUpload, setShowUpload] = useState(false)

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
        <div className="flex items-center justify-between mb-5">
          <span className="text-sm font-medium text-gray-800 bg-white border border-gray-100 rounded-lg px-3 py-1.5">📊 Ops Dashboard</span>
          <button onClick={() => setShowUpload(true)} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-white">↑ Subir reportes</button>
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 overflow-x-auto">
          <button onClick={() => setActiveProduct(null)}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${!activeProduct ? 'bg-white text-gray-800 border border-gray-100' : 'text-gray-500 hover:text-gray-700'}`}>
            Resumen general
          </button>
          {metrics.products.map(p => (
            <button key={p.product} onClick={() => setActiveProduct(p)}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${activeProduct?.product === p.product ? 'bg-white text-gray-800 border border-gray-100' : 'text-gray-500 hover:text-gray-700'}`}>
              {p.product}
            </button>
          ))}
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          {activeProduct ? (
            <ProductDetail m={activeProduct} onBack={() => setActiveProduct(null)} />
          ) : (
            <GeneralView metrics={metrics} adminCosts={adminCosts}
              onAdminChange={(k, v) => setAdminCosts(prev => ({...prev, [k]: v}))}
              onSelectProduct={setActiveProduct} />
          )}
        </div>
      </div>
    </div>
  )
}
