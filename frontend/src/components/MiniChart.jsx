import {
  AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'

const COLOURS = {
  blue:   '#3B82F6',
  green:  '#10B981',
  red:    '#EF4444',
  cyan:   '#06B6D4',
  teal:   '#00D4A8',
  gray:   '#94A3B8',
  purple: '#8B5CF6',
  amber:  '#F59E0B',
}

const GRAD_STOP = {
  blue:   ['rgba(59,130,246,0.18)',  'rgba(59,130,246,0)'],
  green:  ['rgba(16,185,129,0.18)',  'rgba(16,185,129,0)'],
  red:    ['rgba(239,68,68,0.18)',   'rgba(239,68,68,0)'],
  cyan:   ['rgba(6,182,212,0.18)',   'rgba(6,182,212,0)'],
  teal:   ['rgba(0,212,168,0.18)',   'rgba(0,212,168,0)'],
  gray:   ['rgba(148,163,184,0.18)', 'rgba(148,163,184,0)'],
  purple: ['rgba(139,92,246,0.18)',  'rgba(139,92,246,0)'],
  amber:  ['rgba(245,158,11,0.18)',  'rgba(245,158,11,0)'],
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#fff', border: '1px solid #E8EDF5',
      borderRadius: 10, padding: '8px 12px',
      boxShadow: '0 4px 12px rgba(15,23,42,0.1)',
      fontSize: 12,
    }}>
      <p style={{ color: '#64748B', marginBottom: 3 }}>{label}</p>
      <p style={{ fontWeight: 700, color: '#0F172A' }}>{payload[0].value}</p>
    </div>
  )
}

export function TrendArea({ labels = [], data = [], colour = 'blue', height = 140 }) {
  const chartData = labels.map((label, i) => ({ label, value: data[i] ?? 0 }))
  const fill  = COLOURS[colour] || COLOURS.blue
  const stops = GRAD_STOP[colour] || GRAD_STOP.blue
  const gradId = `grad-area-${colour}`

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={fill} stopOpacity={0.18} />
            <stop offset="95%" stopColor={fill} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="2 4" stroke="#F1F5F9" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false}
          interval="preserveStartEnd" />
        <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: fill, strokeWidth: 1, strokeDasharray: '3 3' }} />
        <Area type="monotone" dataKey="value" stroke={fill} strokeWidth={2.5}
          fill={`url(#${gradId})`} dot={false} activeDot={{ r: 4, fill }} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function MonthBar({ labels = [], data = [], colour = 'blue', height = 140 }) {
  const chartData = labels.map((label, i) => ({ label, value: data[i] ?? 0 }))
  const fill = COLOURS[colour] || COLOURS.blue

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -24 }} barCategoryGap="35%">
        <CartesianGrid strokeDasharray="2 4" stroke="#F1F5F9" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
        <Bar dataKey="value" fill={fill} radius={[5, 5, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function StatusPie({ active = 0, revoked = 0, expired = 0, height = 130 }) {
  const pieData = [
    { name: 'Active',  value: active,  colour: '#10B981' },
    { name: 'Revoked', value: revoked, colour: '#EF4444' },
    { name: 'Expired', value: expired, colour: '#94A3B8' },
  ].filter(d => d.value > 0)

  if (!pieData.length) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#CBD5E1', fontSize: 12 }}>No data</p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%"
          innerRadius="52%" outerRadius="75%" paddingAngle={3} strokeWidth={0}>
          {pieData.map(d => <Cell key={d.name} fill={d.colour} />)}
        </Pie>
        <Tooltip
          contentStyle={{
            fontSize: 12, borderRadius: 10, border: '1px solid #E8EDF5',
            boxShadow: '0 4px 12px rgba(15,23,42,0.1)',
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
