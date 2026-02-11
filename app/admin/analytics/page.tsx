"use client";
const COLORS = {
    primary: "#2563EB",     // 사이트 메인 블루
    primaryDark: "#1D4ED8",
    teal: "#0891B2",        // 과하지 않은 청록
    amber: "#B45309",       // 밝지 않은 앰버(차분)
    slate: "#475569",
    gray: "#94A3B8",
};

const barColors = [COLORS.primary, COLORS.teal, COLORS.amber, COLORS.slate, COLORS.gray];
const pieColors = [COLORS.primary, COLORS.teal, COLORS.amber];

import {
    LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
    BarChart, Bar, PieChart, Pie, Cell, Legend
} from "recharts";

const kpis = [
    { label: "Visitors", value: "48,120", delta: "+12.4%" },
    { label: "Downloads", value: "9,884", delta: "+8.1%" },
    { label: "New Resources", value: "27", delta: "+3.7%" },
    { label: "Active Members", value: "312", delta: "+5.2%" },
];

const visitorsDaily = [
    { day: "Mon", v: 5200 }, { day: "Tue", v: 6100 }, { day: "Wed", v: 5800 },
    { day: "Thu", v: 7200 }, { day: "Fri", v: 6900 }, { day: "Sat", v: 4300 }, { day: "Sun", v: 3600 },
];

const downloadsByCategory = [
    { name: "ATM", d: 3200 },
    { name: "Heartbeat", d: 2100 },
    { name: "Workshops", d: 1450 },
    { name: "Awards", d: 980 },
    { name: "Others", d: 760 },
];

const typeShare = [
    { name: "PDF", value: 68 },
    { name: "Link", value: 19 },
    { name: "Media", value: 13 },
];

const recent = [
    { time: "2026-02-11 13:40", action: "Upload", item: "ATM No. 177 (PDF)", by: "admin" },
    { time: "2026-02-11 12:58", action: "Download", item: "Heartbeat Vol. 12", by: "member_024" },
    { time: "2026-02-11 11:22", action: "Upload", item: "Workshop Summary (PDF)", by: "admin" },
    { time: "2026-02-11 10:09", action: "Download", item: "ATM No. 176 (PDF)", by: "member_031" },
    { time: "2026-02-10 18:45", action: "Login", item: "Admin Console", by: "admin" },
];

export default function AdminAnalyticsPage() {
    return (
        <div className="mx-auto max-w-6xl p-6 space-y-6">
            <div className="flex items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold">Analytics Dashboard</h1>
                    <p className="text-sm text-gray-500">Demo data · Last updated 2026-02-11 14:20 (KST)</p>
                </div>
                <div className="flex gap-2">
                    <button className="rounded-lg border px-3 py-2 text-sm">Last 7 days</button>
                    <button className="rounded-lg border px-3 py-2 text-sm">Export</button>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {kpis.map((k) => (
                    <div key={k.label} className="rounded-2xl border bg-white p-4 shadow-sm">
                        <div className="text-sm text-gray-500">{k.label}</div>
                        <div className="mt-1 text-2xl font-semibold">{k.value}</div>
                        <div className="mt-1 text-sm text-gray-600">{k.delta} vs last week</div>
                    </div>
                ))}
            </div>

            <div className="grid md:grid-cols-2 gap-4">
                <div className="rounded-2xl border bg-white p-4 shadow-sm">
                    <div className="mb-3 font-medium">Daily Visitors</div>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={visitorsDaily}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="day" />
                                <YAxis />
                                <Tooltip />
                                <Line
                                    type="monotone"
                                    dataKey="v"
                                    stroke={COLORS.primary}
                                    strokeWidth={3}
                                    dot={false}
                                    activeDot={{ r: 5 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="rounded-2xl border bg-white p-4 shadow-sm">
                    <div className="mb-3 font-medium">Downloads by Category</div>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={downloadsByCategory}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="d" radius={[10, 10, 0, 0]}>
                                    {downloadsByCategory.map((_, i) => (
                                        <Cell key={i} fill={barColors[i % barColors.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="rounded-2xl border bg-white p-4 shadow-sm md:col-span-2">
                    <div className="mb-3 font-medium">Resource Type Share</div>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={typeShare} dataKey="value" nameKey="name" outerRadius={90} label>
                                    {typeShare.map((_, i) => (
                                        <Cell key={i} fill={pieColors[i % pieColors.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="rounded-2xl border bg-white p-4 shadow-sm">
                <div className="mb-3 font-medium">Recent Activity</div>
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead className="text-left text-gray-500">
                            <tr className="border-b">
                                <th className="py-2 pr-4">Time</th>
                                <th className="py-2 pr-4">Action</th>
                                <th className="py-2 pr-4">Item</th>
                                <th className="py-2 pr-4">By</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recent.map((r, i) => (
                                <tr key={i} className="border-b last:border-b-0">
                                    <td className="py-2 pr-4 whitespace-nowrap">{r.time}</td>
                                    <td className="py-2 pr-4">{r.action}</td>
                                    <td className="py-2 pr-4">{r.item}</td>
                                    <td className="py-2 pr-4">{r.by}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}