import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, RefreshControl, Animated } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { light } from "@/src/theme/light";
import { api } from "@/src/api/client";
import { tap } from "@/src/utils/haptics";

type ViewMode = "week" | "month" | "calendar";

function startOfDay(d: Date): Date { const n = new Date(d); n.setHours(0,0,0,0); return n; }
function addDays(d: Date, n: number): Date { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function startOfWeek(d: Date): Date { const n = startOfDay(d); return addDays(n, -n.getDay()); }
function isSameDay(a: Date, b: Date): boolean { return a.toDateString() === b.toDateString(); }
function dateKey(d: Date): string { return d.toDateString(); }
function fmtTime(iso: string): string { return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }); }
function fmtWeekRange(start: Date, end: Date): string {
  const last = addDays(end, -1);
  const sameMonth = start.getMonth() === last.getMonth();
  const s = start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const e = last.toLocaleDateString("en-US", sameMonth ? { day: "numeric" } : { month: "short", day: "numeric" });
  return `${s} \u2013 ${e}, ${last.getFullYear()}`;
}
function fmtDayLabel(d: Date): string { return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }).toUpperCase(); }
function fmtMonthYear(d: Date): string { return d.toLocaleDateString("en-US", { month: "long", year: "numeric" }); }
function shiftDuration(start: string, end: string): string {
  const hrs = (new Date(end).getTime() - new Date(start).getTime()) / 3600000;
  return hrs % 1 === 0 ? `${hrs}h` : `${hrs.toFixed(1)}h`;
}
function estEarnings(start: string, end: string, rate: number): string {
  const hrs = (new Date(end).getTime() - new Date(start).getTime()) / 3600000;
  return `$${(hrs * rate).toFixed(0)}`;
}

const DOW = ["S","M","T","W","T","F","S"];
const DOW_FULL = ["SUN","MON","TUE","WED","THU","FRI","SAT"];

type Stats = { week_hours: number; week_earnings: number; upcoming_shifts: number; needs_ack: number; active_clock: boolean };

export default function Schedule() {
  const router = useRouter();
  const [view, setView] = useState<ViewMode>("week");
  const [weekAnchor, setWeekAnchor] = useState(() => startOfWeek(new Date()));
  const [monthCursor, setMonthCursor] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [selectedDay, setSelectedDay] = useState<Date | null>(() => startOfDay(new Date()));
  const [weekShifts, setWeekShifts] = useState<any[]>([]);
  const [monthShifts, setMonthShifts] = useState<any[]>([]);
  const [calShifts, setCalShifts] = useState<any[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const weekEnd = useMemo(() => addDays(weekAnchor, 7), [weekAnchor]);
  const calGrid = useMemo(() => {
    const first = monthCursor;
    const gridStart = startOfWeek(first);
    const weeks: { date: Date; inMonth: boolean }[][] = [];
    let cursor = gridStart;
    for (let w = 0; w < 6; w++) {
      const week: { date: Date; inMonth: boolean }[] = [];
      for (let i = 0; i < 7; i++) { week.push({ date: cursor, inMonth: cursor.getMonth() === first.getMonth() }); cursor = addDays(cursor, 1); }
      weeks.push(week);
      if (cursor.getMonth() !== first.getMonth() && w >= 3) break;
    }
    return weeks;
  }, [monthCursor]);

  const load = useCallback(async () => {
    setFetching(true);
    try {
      const [statsData] = await Promise.all([api("/schedule/stats")]);
      setStats(statsData);
      if (view === "week") {
        const d = await api(`/schedule?start=${weekAnchor.toISOString()}&end=${weekEnd.toISOString()}`);
        setWeekShifts(d.shifts || []);
      } else if (view === "month") {
        const d = await api(`/schedule?range=month`);
        setMonthShifts(d.shifts || []);
      } else {
        const gridStart = calGrid[0][0].date;
        const gridEnd = addDays(calGrid[calGrid.length - 1][6].date, 1);
        const d = await api(`/schedule?start=${gridStart.toISOString()}&end=${gridEnd.toISOString()}`);
        setCalShifts(d.shifts || []);
      }
    } catch {}
    setFetching(false);
    setInitialLoading(false);
  }, [view, weekAnchor, weekEnd, calGrid]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Background refresh every 30 s — manager shift changes appear automatically.
  useEffect(() => {
    const t = setInterval(() => { load(); }, 30_000);
    return () => clearInterval(t);
  }, [load]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const jumpToToday = () => {
    tap();
    const today = new Date();
    setWeekAnchor(startOfWeek(today));
    setSelectedDay(startOfDay(today));
  };

  const groupByDay = (shifts: any[]) => {
    const map = new Map<string, any[]>();
    shifts.slice().sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()).forEach((s) => {
      const k = dateKey(new Date(s.start));
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(s);
    });
    return map;
  };

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekAnchor, i)), [weekAnchor]);
  const weekGrouped = useMemo(() => groupByDay(weekShifts), [weekShifts]);
  const monthGrouped = useMemo(() => groupByDay(monthShifts), [monthShifts]);
  const calDaysWithShifts = useMemo(() => new Set(calShifts.map((s) => dateKey(new Date(s.start)))), [calShifts]);
  const selectedDayShifts = useMemo(() => {
    if (!selectedDay) return [];
    return calShifts.filter((s) => isSameDay(new Date(s.start), selectedDay)).sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  }, [calShifts, selectedDay]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Schedule</Text>
          {fetching && !initialLoading && <ActivityIndicator size="small" color={light.textTertiary} style={styles.titleSpinner} />}
        </View>
        {/* Stats bar */}
        {stats && (
          <View style={styles.statsCard}>
            <View style={styles.statsRow}>
              <View style={styles.statChip}>
                <Text style={styles.statVal} numberOfLines={1}>{stats.week_hours}h</Text>
                <Text style={styles.statLbl} numberOfLines={1}>this week</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statChip}>
                <Text style={styles.statVal} numberOfLines={1}>${stats.week_earnings.toFixed(0)}</Text>
                <Text style={styles.statLbl} numberOfLines={1}>est. pay</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statChip}>
                <Text style={styles.statVal} numberOfLines={1}>{stats.upcoming_shifts}</Text>
                <Text style={styles.statLbl} numberOfLines={1}>upcoming</Text>
              </View>
            </View>
            {stats.needs_ack > 0 && (
              <View style={styles.unreadRow}>
                <Ionicons name="alert-circle" size={13} color={light.amber} />
                <Text style={styles.unreadText} numberOfLines={1}>
                  {stats.needs_ack} unread {stats.needs_ack === 1 ? "shift" : "shifts"} need acknowledgement
                </Text>
              </View>
            )}
          </View>
        )}
        <View style={styles.segmented}>
          {(["week","month","calendar"] as ViewMode[]).map((m) => (
            <Pressable key={m} testID={`range-${m}`} onPress={() => { tap(); setView(m); }} style={[styles.segBtn, view === m && styles.segActive]}>
              <Text style={[styles.segText, view === m && styles.segTextActive]}>{m === "week" ? "Week" : m === "month" ? "Month" : "Calendar"}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {initialLoading ? (
        <ActivityIndicator color={light.textSecondary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={light.textSecondary} />}
          showsVerticalScrollIndicator={false}
        >
          {view === "week" && (
            <>
              <View style={styles.rangeRow}>
                <Text style={styles.rangeText}>{fmtWeekRange(weekAnchor, weekEnd)}</Text>
                <View style={styles.navBtns}>
                  <Pressable testID="today-btn" style={styles.todayBtn} onPress={jumpToToday}>
                    <Text style={styles.todayBtnText}>Today</Text>
                  </Pressable>
                  <Pressable testID="week-prev" style={styles.navBtn} onPress={() => { tap(); setWeekAnchor(addDays(weekAnchor, -7)); }}>
                    <Ionicons name="chevron-back" size={18} color={light.text} />
                  </Pressable>
                  <Pressable testID="week-next" style={styles.navBtn} onPress={() => { tap(); setWeekAnchor(addDays(weekAnchor, 7)); }}>
                    <Ionicons name="chevron-forward" size={18} color={light.text} />
                  </Pressable>
                </View>
              </View>

              <View style={styles.dayStrip}>
                {weekDays.map((d) => {
                  const isSelected = selectedDay && isSameDay(d, selectedDay);
                  const hasShift = weekGrouped.has(dateKey(d));
                  const isToday = isSameDay(d, new Date());
                  return (
                    <Pressable key={d.toISOString()} testID={`week-day-${d.getDate()}`} style={styles.dayCell} onPress={() => { tap(); setSelectedDay(d); }}>
                      <Text style={[styles.dayDow, isToday && styles.dayDowToday]}>{DOW_FULL[d.getDay()]}</Text>
                      <View style={[styles.dayNumWrap, isSelected && styles.dayNumWrapActive, !isSelected && isToday && styles.dayNumWrapToday]}>
                        <Text style={[styles.dayNum, isSelected && styles.dayNumActive]}>{d.getDate()}</Text>
                      </View>
                      <View style={[styles.dayDot, hasShift ? styles.dayDotOn : styles.dayDotOff]} />
                    </Pressable>
                  );
                })}
              </View>

              {weekShifts.length === 0 ? (
                <Text style={styles.empty}>No shifts this week</Text>
              ) : (
                weekDays.map((d) => {
                  const shifts = weekGrouped.get(dateKey(d));
                  if (!shifts) return null;
                  return <DayGroup key={dateKey(d)} label={fmtDayLabel(d)} shifts={shifts} router={router} />;
                })
              )}
            </>
          )}

          {view === "month" && (
            <>
              {monthShifts.length === 0 ? (
                <Text style={styles.empty}>No shifts in this range</Text>
              ) : (
                Array.from(monthGrouped.entries()).map(([k, shifts]) => (
                  <DayGroup key={k} label={fmtDayLabel(new Date(shifts[0].start))} shifts={shifts} router={router} />
                ))
              )}
            </>
          )}

          {view === "calendar" && (
            <>
              <View style={styles.calCard} testID="calendar-card">
                <View style={styles.calHeaderRow}>
                  <Pressable testID="cal-prev" style={styles.calNavBtn} onPress={() => { tap(); setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 1, 1)); }}>
                    <Ionicons name="chevron-back" size={18} color="#fff" />
                  </Pressable>
                  <Text style={styles.calMonthText}>{fmtMonthYear(monthCursor)}</Text>
                  <Pressable testID="cal-next" style={styles.calNavBtn} onPress={() => { tap(); setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1)); }}>
                    <Ionicons name="chevron-forward" size={18} color="#fff" />
                  </Pressable>
                </View>
                <View style={styles.calDowRow}>{DOW.map((d, i) => <Text key={i} style={styles.calDowText}>{d}</Text>)}</View>
                {calGrid.map((week, wi) => (
                  <View key={wi} style={styles.calWeekRow}>
                    {week.map(({ date, inMonth }) => {
                      const today = isSameDay(date, new Date());
                      const selected = selectedDay && isSameDay(date, selectedDay);
                      const hasShift = calDaysWithShifts.has(dateKey(date));
                      return (
                        <Pressable key={date.toISOString()} testID={`cal-date-${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`} style={styles.calCell} onPress={() => { tap(); setSelectedDay(date); }} disabled={!inMonth}>
                          <View style={[styles.calCellCircle, selected && styles.calCellCircleSelected, !selected && today && styles.calCellCircleToday]}>
                            <Text style={[styles.calCellText, !inMonth && styles.calCellTextDim, selected && styles.calCellTextSelected]}>{date.getDate()}</Text>
                          </View>
                          <View style={[styles.calDot, hasShift && inMonth ? styles.calDotOn : styles.calDotOff]} />
                        </Pressable>
                      );
                    })}
                  </View>
                ))}
              </View>

              <Text style={styles.calListLabel}>
                {selectedDay ? selectedDay.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }).toUpperCase() : "SELECT A DATE"}
              </Text>
              <AnimatedDayCard dayKey={selectedDay ? dateKey(selectedDay) : "none"}>
                {selectedDayShifts.length === 0 ? (
                  <Text style={styles.emptyDark}>No shifts scheduled</Text>
                ) : (
                  selectedDayShifts.map((s, i) => (
                    <ShiftRow key={s.id} shift={s} bordered={i < selectedDayShifts.length - 1} dark onPress={() => router.push({ pathname: "/shift/[id]", params: { id: s.id } })} />
                  ))
                )}
              </AnimatedDayCard>
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function DayGroup({ label, shifts, router }: { label: string; shifts: any[]; router: any }) {
  return (
    <View style={styles.dayGroup}>
      <Text style={styles.dayGroupLabel}>{label}</Text>
      <View style={styles.listCard}>
        {shifts.map((s, i) => (
          <ShiftRow key={s.id} shift={s} bordered={i < shifts.length - 1} onPress={() => router.push({ pathname: "/shift/[id]", params: { id: s.id } })} />
        ))}
      </View>
    </View>
  );
}

function ShiftRow({ shift, bordered, onPress, dark }: { shift: any; bordered: boolean; onPress: () => void; dark?: boolean }) {
  const isCompleted = shift.status === "completed";
  const needsAck = !shift.instructions_acknowledged && shift.status === "scheduled";
  const accentColor = isCompleted ? "#22C55E" : needsAck ? "#F59E0B" : "#3B82F6";

  return (
    <Pressable testID={`shift-item-${shift.id}`} onPress={onPress} style={[styles.shiftRow, bordered && (dark ? styles.rowDividerDark : styles.rowDivider)]}>
      <View style={[styles.shiftAccent, { backgroundColor: accentColor }]} />
      <View style={{ flex: 1, paddingLeft: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text style={[styles.shiftTime, dark && styles.shiftTimeDark]}>
            {new Date(shift.start).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}
            {" \u2013 "}
            {new Date(shift.end).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}
          </Text>
          <View style={[styles.durationBadge, dark && styles.durationBadgeDark]}>
            <Text style={[styles.durationText, dark && styles.durationTextDark]}>
              {shiftDuration(shift.start, shift.end)}
            </Text>
          </View>
        </View>
        <Text style={[styles.shiftSite, dark && styles.shiftSiteDark]}>{shift.site?.name}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 }}>
          <Text style={[styles.shiftRole, dark && styles.shiftRoleDark]}>{shift.role}</Text>
          {shift.pay_rate && (
            <Text style={[styles.shiftPay, dark && { color: "rgba(255,255,255,0.4)" }]}>
              · {estEarnings(shift.start, shift.end, shift.pay_rate)} est.
            </Text>
          )}
        </View>
      </View>
      <View style={[styles.statusDot, { backgroundColor: accentColor + "28" }]}>
        <Ionicons
          name={isCompleted ? "checkmark" : needsAck ? "alert" : "checkmark"}
          size={14}
          color={accentColor}
        />
      </View>
    </Pressable>
  );
}

function AnimatedDayCard({ dayKey, children }: { dayKey: string; children: React.ReactNode }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    anim.setValue(0);
    Animated.spring(anim, { toValue: 1, useNativeDriver: false, friction: 9, tension: 90 }).start();
  }, [dayKey]);
  const backgroundColor = anim.interpolate({ inputRange: [0, 1], outputRange: ["#2C2C2E", light.black] });
  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] });
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] });
  return (
    <Animated.View style={[styles.calListCard, { backgroundColor, opacity: anim, transform: [{ scale }, { translateY }] }]}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: light.bg },
  header: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 14 },
  titleRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  title: { color: light.text, fontSize: 32, fontWeight: "800", letterSpacing: -0.5 },
  titleSpinner: { marginLeft: 10 },

  statsCard: { backgroundColor: light.card, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 14, borderWidth: 1, borderColor: light.cardBorder },
  statsRow: { flexDirection: "row", alignItems: "center" },
  statChip: { flexDirection: "row", alignItems: "center", gap: 4, flexShrink: 1, minWidth: 0 },
  statVal: { color: light.text, fontSize: 14, fontWeight: "700", flexShrink: 1 },
  statLbl: { color: light.textTertiary, fontSize: 11, flexShrink: 1 },
  statDivider: { width: 1, height: 16, backgroundColor: light.cardBorder, marginHorizontal: 10 },
  unreadRow: {
    flexDirection: "row", alignItems: "center", gap: 5,
    marginTop: 10, paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: light.cardBorder,
  },
  unreadText: { color: light.amber, fontSize: 12, fontWeight: "600", flexShrink: 1 },

  segmented: { flexDirection: "row", backgroundColor: light.chip, borderRadius: 999, padding: 3 },
  segBtn: { flex: 1, paddingVertical: 9, alignItems: "center", borderRadius: 999 },
  segActive: { backgroundColor: "#fff", shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  segText: { color: light.textSecondary, fontSize: 13, fontWeight: "600" },
  segTextActive: { color: light.text },

  rangeRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4, marginBottom: 16 },
  rangeText: { color: light.textSecondary, fontSize: 14, fontWeight: "500" },
  navBtns: { flexDirection: "row", gap: 6, alignItems: "center" },
  todayBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: light.chip },
  todayBtnText: { color: light.text, fontSize: 12, fontWeight: "600" },
  navBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: light.cardBorder, alignItems: "center", justifyContent: "center", backgroundColor: "#fff" },

  dayStrip: { flexDirection: "row", justifyContent: "space-between", marginBottom: 22 },
  dayCell: { alignItems: "center", gap: 8, width: 36 },
  dayDow: { color: light.textTertiary, fontSize: 10, fontWeight: "600", letterSpacing: 0.3 },
  dayDowToday: { color: light.text },
  dayNumWrap: { width: 34, height: 34, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  dayNumWrapActive: { backgroundColor: light.black },
  dayNumWrapToday: { borderWidth: 1.5, borderColor: light.text },
  dayNum: { color: light.text, fontSize: 15, fontWeight: "700" },
  dayNumActive: { color: "#fff" },
  dayDot: { width: 5, height: 5, borderRadius: 2.5 },
  dayDotOn: { backgroundColor: "#3B82F6" },
  dayDotOff: { backgroundColor: "transparent" },

  dayGroup: { marginBottom: 22 },
  dayGroupLabel: { color: light.textSecondary, fontSize: 11, fontWeight: "700", letterSpacing: 0.6, marginBottom: 8 },
  listCard: { backgroundColor: light.card, borderRadius: 16, borderWidth: 1, borderColor: light.cardBorder, overflow: "hidden" },

  shiftRow: { flexDirection: "row", alignItems: "center", padding: 14, paddingLeft: 0 },
  shiftAccent: { width: 3, alignSelf: "stretch", borderRadius: 2, marginRight: 0 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: light.cardBorder },
  rowDividerDark: { borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.1)" },
  shiftTime: { color: light.textSecondary, fontSize: 12.5, fontWeight: "500" },
  shiftTimeDark: { color: "rgba(255,255,255,0.55)" },
  shiftSite: { color: light.text, fontSize: 15.5, fontWeight: "700", marginTop: 2 },
  shiftSiteDark: { color: "#fff" },
  shiftRole: { color: light.textSecondary, fontSize: 12.5, marginTop: 1 },
  shiftRoleDark: { color: "rgba(255,255,255,0.45)" },
  shiftPay: { color: light.textTertiary, fontSize: 12, marginTop: 1 },
  durationBadge: { backgroundColor: light.chip, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  durationBadgeDark: { backgroundColor: "rgba(255,255,255,0.12)" },
  durationText: { color: light.textSecondary, fontSize: 11, fontWeight: "600" },
  durationTextDark: { color: "rgba(255,255,255,0.5)" },
  statusDot: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", marginLeft: 8, marginRight: 4 },

  empty: { color: light.textSecondary, textAlign: "center", marginTop: 60, fontSize: 15 },
  emptyDark: { color: "rgba(255,255,255,0.5)", textAlign: "center", paddingVertical: 28, fontSize: 14 },

  calCard: { backgroundColor: light.black, borderRadius: 20, padding: 16, marginTop: 6 },
  calHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  calNavBtn: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.1)" },
  calMonthText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  calDowRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  calDowText: { color: "rgba(255,255,255,0.4)", fontSize: 12, fontWeight: "600", width: 36, textAlign: "center" },
  calWeekRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  calCell: { width: 36, alignItems: "center", gap: 3, paddingVertical: 3 },
  calCellCircle: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  calCellCircleSelected: { backgroundColor: "#fff" },
  calCellCircleToday: { borderWidth: 1, borderColor: "rgba(255,255,255,0.5)" },
  calCellText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  calCellTextDim: { color: "rgba(255,255,255,0.25)" },
  calCellTextSelected: { color: light.black },
  calDot: { width: 4, height: 4, borderRadius: 2 },
  calDotOn: { backgroundColor: "#3B82F6" },
  calDotOff: { backgroundColor: "transparent" },
  calListLabel: { color: light.textSecondary, fontSize: 11, fontWeight: "700", letterSpacing: 0.6, marginTop: 20, marginBottom: 8 },
  calListCard: { borderRadius: 16, overflow: "hidden" },
});
