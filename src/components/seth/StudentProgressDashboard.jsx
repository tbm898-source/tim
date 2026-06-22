import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Loader2, GraduationCap, CheckCircle2, Clock, AlertCircle, TrendingUp } from "lucide-react";

const STATUS_COLORS = {
    active: "#22d3ee",
    completed: "#22c55e",
    needs_update: "#f59e0b",
    enrolled: "#818cf8",
    in_progress: "#60a5fa",
    withdrawn: "#f87171",
    on_hold: "#a3a3a3",
};

const STATUS_ICON = {
    active: <CheckCircle2 className="w-4 h-4 text-cyan-400" />,
    completed: <CheckCircle2 className="w-4 h-4 text-green-400" />,
    needs_update: <AlertCircle className="w-4 h-4 text-yellow-400" />,
};

export default function StudentProgressDashboard() {
    const [loading, setLoading] = useState(true);
    const [students, setStudents] = useState([]);
    const [enrollments, setEnrollments] = useState([]);
    const [pathways, setPathways] = useState([]);
    const [progress, setProgress] = useState([]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const [s, e, p, pr] = await Promise.all([
            base44.entities.Student.list(),
            base44.entities.Enrollment.list(),
            base44.entities.LearningPathway.list(),
            base44.entities.UserProgress.list(),
        ]);
        setStudents(s);
        setEnrollments(e);
        setPathways(p);
        setProgress(pr);
        setLoading(false);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16 text-cyan-400">
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                <span>Loading dashboard...</span>
            </div>
        );
    }

    // --- Computed stats ---
    const totalStudents = students.length;
    const activeStudents = students.filter(s => s.status === "active").length;

    const enrollmentStatusCounts = enrollments.reduce((acc, e) => {
        acc[e.status] = (acc[e.status] || 0) + 1;
        return acc;
    }, {});
    const enrollmentPieData = Object.entries(enrollmentStatusCounts).map(([name, value]) => ({ name, value }));

    const pathwayStatusCounts = pathways.reduce((acc, p) => {
        acc[p.status] = (acc[p.status] || 0) + 1;
        return acc;
    }, {});

    // Completion rate per enrollment
    const completedLessons = progress.filter(p => p.completed).length;
    const totalLessons = progress.length;
    const completionRate = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    // Avg quiz score
    const withScore = progress.filter(p => p.quiz_score != null);
    const avgQuizScore = withScore.length > 0
        ? Math.round(withScore.reduce((sum, p) => sum + p.quiz_score, 0) / withScore.length)
        : null;

    // Per-student completion %
    const studentProgressMap = {};
    progress.forEach(p => {
        if (!studentProgressMap[p.student_id]) studentProgressMap[p.student_id] = { total: 0, done: 0 };
        studentProgressMap[p.student_id].total++;
        if (p.completed) studentProgressMap[p.student_id].done++;
    });

    const barData = students.slice(0, 10).map(s => {
        const rec = studentProgressMap[s.id];
        const pct = rec && rec.total > 0 ? Math.round((rec.done / rec.total) * 100) : 0;
        return { name: (s.full_name || "Unknown").split(" ")[0], completion: pct };
    });

    const statCards = [
        { label: "Total Students", value: totalStudents, icon: <GraduationCap className="w-5 h-5 text-cyan-400" />, color: "cyan" },
        { label: "Active Students", value: activeStudents, icon: <CheckCircle2 className="w-5 h-5 text-green-400" />, color: "green" },
        { label: "Lesson Completion", value: `${completionRate}%`, icon: <TrendingUp className="w-5 h-5 text-indigo-400" />, color: "indigo" },
        { label: "Avg Quiz Score", value: avgQuizScore != null ? `${avgQuizScore}%` : "—", icon: <Clock className="w-5 h-5 text-yellow-400" />, color: "yellow" },
    ];

    return (
        <div className="space-y-6 pb-4">
            {/* Stat Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {statCards.map(card => (
                    <div key={card.label} className="bg-gray-900/70 border border-gray-700/50 rounded-xl p-4 flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-gray-400 text-xs uppercase tracking-wide">
                            {card.icon}
                            {card.label}
                        </div>
                        <div className="text-2xl font-bold text-white">{card.value}</div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Bar Chart: Student Completion */}
                <div className="bg-gray-900/70 border border-gray-700/50 rounded-xl p-4">
                    <h3 className="text-cyan-300 text-sm font-semibold mb-3 uppercase tracking-wide">Student Lesson Completion %</h3>
                    {barData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={180}>
                            <BarChart data={barData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                                <XAxis dataKey="name" tick={{ fill: "#9ca3af", fontSize: 11 }} />
                                <YAxis domain={[0, 100]} tick={{ fill: "#9ca3af", fontSize: 11 }} />
                                <Tooltip
                                    contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 8 }}
                                    labelStyle={{ color: "#e5e7eb" }}
                                    itemStyle={{ color: "#22d3ee" }}
                                    formatter={(v) => [`${v}%`, "Completion"]}
                                />
                                <Bar dataKey="completion" fill="#22d3ee" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <p className="text-gray-500 text-sm py-8 text-center">No progress data yet</p>
                    )}
                </div>

                {/* Pie Chart: Enrollment Status */}
                <div className="bg-gray-900/70 border border-gray-700/50 rounded-xl p-4">
                    <h3 className="text-cyan-300 text-sm font-semibold mb-3 uppercase tracking-wide">Enrollment Status</h3>
                    {enrollmentPieData.length > 0 ? (
                        <div className="flex items-center gap-4">
                            <ResponsiveContainer width="55%" height={160}>
                                <PieChart>
                                    <Pie data={enrollmentPieData} cx="50%" cy="50%" outerRadius={65} dataKey="value" strokeWidth={0}>
                                        {enrollmentPieData.map((entry, i) => (
                                            <Cell key={i} fill={STATUS_COLORS[entry.name] || "#6b7280"} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 8 }}
                                        itemStyle={{ color: "#e5e7eb" }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="flex flex-col gap-1.5 text-xs">
                                {enrollmentPieData.map((entry, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: STATUS_COLORS[entry.name] || "#6b7280" }} />
                                        <span className="text-gray-300 capitalize">{entry.name.replace("_", " ")}</span>
                                        <span className="text-gray-500 ml-auto pl-2">{entry.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <p className="text-gray-500 text-sm py-8 text-center">No enrollment data yet</p>
                    )}
                </div>
            </div>

            {/* Learning Pathway Status */}
            <div className="bg-gray-900/70 border border-gray-700/50 rounded-xl p-4">
                <h3 className="text-cyan-300 text-sm font-semibold mb-3 uppercase tracking-wide">Learning Pathway Status</h3>
                {pathways.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-4">No learning pathways found</p>
                ) : (
                    <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                        {pathways.map(pathway => {
                            const studentRec = students.find(s => s.id === pathway.student_id);
                            const studentName = studentRec?.full_name || pathway.student_id?.slice(0, 8) || "—";
                            const statusIcon = STATUS_ICON[pathway.status] || <Clock className="w-4 h-4 text-gray-400" />;
                            const pct = pathway.performance_metrics?.completion_rate != null
                                ? Math.round(pathway.performance_metrics.completion_rate)
                                : null;
                            return (
                                <div key={pathway.id} className="flex items-center gap-3 bg-gray-800/50 rounded-lg px-3 py-2">
                                    {statusIcon}
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm text-white truncate">{pathway.pathway_title}</div>
                                        <div className="text-xs text-gray-400">{studentName}</div>
                                    </div>
                                    {pct != null && (
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <div className="w-20 bg-gray-700 rounded-full h-1.5">
                                                <div
                                                    className="h-1.5 rounded-full"
                                                    style={{ width: `${pct}%`, background: STATUS_COLORS[pathway.status] || "#22d3ee" }}
                                                />
                                            </div>
                                            <span className="text-xs text-gray-400 w-8 text-right">{pct}%</span>
                                        </div>
                                    )}
                                    <span className="text-xs capitalize px-2 py-0.5 rounded-full text-white ml-1" style={{ background: (STATUS_COLORS[pathway.status] || "#6b7280") + "33", border: `1px solid ${STATUS_COLORS[pathway.status] || "#6b7280"}55` }}>
                                        {pathway.status?.replace("_", " ")}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}