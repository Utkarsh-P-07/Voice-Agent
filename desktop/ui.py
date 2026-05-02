
# -*- coding: utf-8 -*-
"""
Voice Todo Agent — Full Dashboard UI (tkinter desktop)
Run:   python desktop/ui.py
"""
import json
import os
import sys
import threading
import tkinter as tk
from datetime import datetime
from pathlib import Path
from tkinter import font as tkfont, messagebox, simpledialog

# Project root on path so core/ imports work
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from dotenv import load_dotenv
load_dotenv(ROOT / ".env")
load_dotenv()

# ─────────────────────────────────────────────────────────────────────────────
# THEME
# ─────────────────────────────────────────────────────────────────────────────
SIDEBAR_BG    = "#252525"
SIDEBAR_HOVER = "#333333"
SIDEBAR_SEL   = "#2e2e2e"
ACCENT        = "#e05c3a"
MAIN_BG       = "#f2f2f2"
CARD_BG       = "#ffffff"
CARD_BORDER   = "#e8e8e8"
TEXT_DARK     = "#1a1a1a"
TEXT_MID      = "#555555"
TEXT_LIGHT    = "#aaaaaa"
INPUT_BG      = "#f7f7f7"
GREEN         = "#4caf50"
AMBER         = "#ff9800"
RED_SOFT      = "#e05c3a"
BLUE          = "#4a90d9"
P_HIGH        = "#e05c3a"
P_MED         = "#f0a030"
P_LOW         = "#60b060"
CAT_COLORS    = {
    "preference": "#7c4dff",
    "event":      "#00bcd4",
    "goal":       "#ff9800",
    "general":    "#607d8b",
}

NAV = [
    ("Dashboard", "⊞"),
    ("Todos",     "☑"),
    ("Memory",    "◎"),
    ("Stats",     "▦"),
    ("Profile",   "👤"),
    ("Settings",  "⚙"),
]


# ─────────────────────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────────────────────

def card(parent, **kw) -> tk.Frame:
    """White rounded-looking card frame."""
    defaults = dict(bg=CARD_BG, padx=16, pady=14,
                    highlightbackground=CARD_BORDER, highlightthickness=1,
                    relief="flat", bd=0)
    defaults.update(kw)
    return tk.Frame(parent, **defaults)


def label(parent, text="", size=10, bold=False, color=TEXT_DARK, **kw) -> tk.Label:
    weight = "bold" if bold else "normal"
    f = tkfont.Font(family="Segoe UI", size=size, weight=weight)
    return tk.Label(parent, text=text, font=f, fg=color, bg=parent["bg"], **kw)


def section_title(parent, text: str):
    label(parent, text, size=14, bold=True).pack(anchor="w", pady=(0, 10))


def pill(parent, text: str, bg: str, fg: str = "#fff") -> tk.Label:
    return tk.Label(parent, text=text, bg=bg, fg=fg,
                    font=tkfont.Font(family="Segoe UI", size=8),
                    padx=7, pady=3)


def scrollable(parent, bg=MAIN_BG):
    """Returns (outer_frame, inner_frame). Pack outer_frame."""
    outer = tk.Frame(parent, bg=bg)
    canvas = tk.Canvas(outer, bg=bg, highlightthickness=0)
    sb = tk.Scrollbar(outer, orient="vertical", command=canvas.yview)
    inner = tk.Frame(canvas, bg=bg)
    inner.bind("<Configure>",
               lambda e: canvas.configure(scrollregion=canvas.bbox("all")))
    canvas.create_window((0, 0), window=inner, anchor="nw")
    canvas.configure(yscrollcommand=sb.set)
    canvas.pack(side="left", fill="both", expand=True)
    sb.pack(side="right", fill="y")

    def _on_mousewheel(event):
        canvas.yview_scroll(int(-1 * (event.delta / 120)), "units")
    canvas.bind_all("<MouseWheel>", _on_mousewheel)
    return outer, inner


# ─────────────────────────────────────────────────────────────────────────────
# MAIN APP
# ─────────────────────────────────────────────────────────────────────────────

class App(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("Voice Todo Agent  ·  Groq")
        self.configure(bg=MAIN_BG)
        self.geometry("1200x740")
        self.minsize(1000, 640)

        self._active_page  = "Dashboard"
        self._listening    = False
        self._groq_client  = None
        self._conversation: list[dict] = []
        self._page_frames: dict[str, tk.Frame] = {}

        self._load_conversation()
        self._build_ui()
        self._show_page("Dashboard")

        # Auto-refresh todos every 5 s
        self._schedule_refresh()

    # ── Fonts ─────────────────────────────────────────────────────────────────
    def _f(self, size=10, bold=False):
        return tkfont.Font(family="Segoe UI", size=size,
                           weight="bold" if bold else "normal")

    # ── Top-level layout ──────────────────────────────────────────────────────
    def _build_ui(self):
        self._sidebar = tk.Frame(self, bg=SIDEBAR_BG, width=200)
        self._sidebar.pack(side="left", fill="y")
        self._sidebar.pack_propagate(False)

        self._content = tk.Frame(self, bg=MAIN_BG)
        self._content.pack(side="left", fill="both", expand=True)

        self._build_sidebar()
        self._build_all_pages()

    # ── Sidebar ───────────────────────────────────────────────────────────────
    def _build_sidebar(self):
        # Brand
        brand = tk.Frame(self._sidebar, bg=SIDEBAR_BG, pady=22)
        brand.pack(fill="x")
        tk.Label(brand, text="🤖", bg=SIDEBAR_BG, fg=ACCENT,
                 font=self._f(18)).pack(side="left", padx=(20, 8))
        tk.Label(brand, text="VoiceAgent", bg=SIDEBAR_BG, fg="#ffffff",
                 font=self._f(13, bold=True)).pack(side="left")

        # Divider
        tk.Frame(self._sidebar, bg="#3a3a3a", height=1).pack(fill="x", padx=16, pady=(0, 8))

        # Nav
        self._nav_frames: dict[str, tk.Frame] = {}
        for name, icon in NAV:
            self._nav_frames[name] = self._make_nav_item(name, icon)

        # Spacer
        tk.Frame(self._sidebar, bg=SIDEBAR_BG).pack(fill="both", expand=True)

        # Bottom help card
        help_card = tk.Frame(self._sidebar, bg="#333333", padx=14, pady=14)
        help_card.pack(fill="x", padx=14, pady=(0, 18))
        tk.Label(help_card, text="Need help?", bg="#333333", fg="#ffffff",
                 font=self._f(9, bold=True)).pack(anchor="w")
        tk.Label(help_card, text="Use voice or text to\nmanage your tasks.",
                 bg="#333333", fg=TEXT_LIGHT, font=self._f(8),
                 justify="left").pack(anchor="w", pady=(4, 8))
        btn = tk.Label(help_card, text="Open Chat →", bg=ACCENT, fg="#fff",
                       font=self._f(8), padx=10, pady=5, cursor="hand2")
        btn.pack(anchor="w")
        btn.bind("<Button-1>", lambda e: self._show_page("Dashboard"))

    def _make_nav_item(self, name: str, icon: str) -> tk.Frame:
        is_active = name == self._active_page
        bg = SIDEBAR_SEL if is_active else SIDEBAR_BG
        frame = tk.Frame(self._sidebar, bg=bg, cursor="hand2")
        frame.pack(fill="x", padx=10, pady=2)

        if is_active:
            tk.Frame(frame, bg=ACCENT, width=4).pack(side="left", fill="y")

        tk.Label(frame, text=icon, bg=bg,
                 fg=ACCENT if is_active else "#888888",
                 font=self._f(13), width=2).pack(side="left", padx=(10, 6), pady=11)
        tk.Label(frame, text=name, bg=bg,
                 fg="#ffffff" if is_active else "#aaaaaa",
                 font=self._f(10)).pack(side="left")

        for w in [frame] + frame.winfo_children():
            w.bind("<Button-1>", lambda e, n=name: self._show_page(n))
            w.bind("<Enter>",    lambda e, f=frame, a=is_active: f.config(bg=SIDEBAR_HOVER) if not a else None)
            w.bind("<Leave>",    lambda e, f=frame, b=bg: f.config(bg=b))
        return frame

    def _show_page(self, name: str):
        self._active_page = name
        # Rebuild sidebar highlight
        for w in self._sidebar.winfo_children():
            w.destroy()
        self._build_sidebar()
        # Show correct page
        for n, f in self._page_frames.items():
            if n == name:
                f.pack(fill="both", expand=True)
            else:
                f.pack_forget()
        # Refresh data on switch
        if name in ("Dashboard", "Todos"):
            self._refresh_todos()
        elif name == "Memory":
            self._refresh_memory()
        elif name == "Stats":
            self._refresh_stats()

    # ── Build all pages ───────────────────────────────────────────────────────
    def _build_all_pages(self):
        for name in [n for n, _ in NAV]:
            f = tk.Frame(self._content, bg=MAIN_BG)
            self._page_frames[name] = f
            builder = getattr(self, f"_build_{name.lower()}_page", None)
            if builder:
                builder(f)

    # =========================================================================
    # PAGE: DASHBOARD
    # =========================================================================
    def _build_dashboard_page(self, parent: tk.Frame):
        # Split: left content + right chat
        left = tk.Frame(parent, bg=MAIN_BG)
        left.pack(side="left", fill="both", expand=True, padx=(28, 14), pady=24)

        right = tk.Frame(parent, bg=CARD_BG, width=330,
                         highlightbackground=CARD_BORDER, highlightthickness=1)
        right.pack(side="right", fill="y", padx=(0, 24), pady=24)
        right.pack_propagate(False)

        self._build_dashboard_left(left)
        self._build_chat_panel(right)

    def _build_dashboard_left(self, parent: tk.Frame):
        # Greeting
        now_h = datetime.now().hour
        greet = "Good morning" if now_h < 12 else ("Good afternoon" if now_h < 18 else "Good evening")
        tk.Label(parent, text=f"{greet}! 👋",
                 bg=MAIN_BG, fg=TEXT_DARK,
                 font=self._f(24, bold=True)).pack(anchor="w")
        tk.Label(parent, text="Here's your task overview for today.",
                 bg=MAIN_BG, fg=TEXT_MID, font=self._f(10)).pack(anchor="w", pady=(2, 18))

        # ── Stat cards row ────────────────────────────────────────────────────
        stats_row = tk.Frame(parent, bg=MAIN_BG)
        stats_row.pack(fill="x", pady=(0, 16))
        self._dash_stat_frames: list = []
        for i in range(4):
            f = card(stats_row, padx=14, pady=12)
            f.pack(side="left", fill="x", expand=True, padx=(0, 10) if i < 3 else 0)
            self._dash_stat_frames.append(f)

        # ── Progress card ─────────────────────────────────────────────────────
        prog_card = card(parent, padx=18, pady=16)
        prog_card.pack(fill="x", pady=(0, 14))

        left_prog = tk.Frame(prog_card, bg=CARD_BG)
        left_prog.pack(side="left", fill="both", expand=True)

        self._prog_title = tk.Label(left_prog, text="Loading…",
                                    bg=CARD_BG, fg=TEXT_DARK, font=self._f(11, bold=True))
        self._prog_title.pack(anchor="w")

        bar_bg = tk.Frame(left_prog, bg="#eeeeee", height=10)
        bar_bg.pack(fill="x", pady=(10, 4))
        bar_bg.pack_propagate(False)
        self._prog_bar = tk.Frame(bar_bg, bg=ACCENT, height=10)
        self._prog_bar.place(x=0, y=0, relheight=1, relwidth=0)

        self._prog_sub = tk.Label(left_prog, text="", bg=CARD_BG,
                                  fg=TEXT_LIGHT, font=self._f(9))
        self._prog_sub.pack(anchor="e")

        tk.Label(prog_card, text="⚡", bg=ACCENT, fg="#fff",
                 font=self._f(16), padx=12, pady=8).pack(side="right", padx=(14, 0))

        # ── Quick actions ─────────────────────────────────────────────────────
        qa_row = tk.Frame(parent, bg=MAIN_BG)
        qa_row.pack(fill="x", pady=(0, 16))
        for icon, lbl, cmd in [
            ("➕", "Add Task",   self._quick_add_todo),
            ("📋", "List Tasks", lambda: self._show_page("Todos")),
            ("🧠", "Memory",     lambda: self._show_page("Memory")),
            ("📊", "Stats",      lambda: self._show_page("Stats")),
            ("⚙",  "Settings",  lambda: self._show_page("Settings")),
        ]:
            b = card(qa_row, padx=12, pady=10)
            b.pack(side="left", padx=(0, 10))
            b.config(cursor="hand2")
            tk.Label(b, text=icon, bg=CARD_BG, font=self._f(16)).pack()
            tk.Label(b, text=lbl, bg=CARD_BG, fg=TEXT_MID, font=self._f(8)).pack()
            b.bind("<Button-1>", lambda e, c=cmd: c())
            for ch in b.winfo_children():
                ch.bind("<Button-1>", lambda e, c=cmd: c())

        # ── Recent todos ──────────────────────────────────────────────────────
        hdr = tk.Frame(parent, bg=MAIN_BG)
        hdr.pack(fill="x", pady=(0, 8))
        tk.Label(hdr, text="Recent Tasks", bg=MAIN_BG, fg=TEXT_DARK,
                 font=self._f(13, bold=True)).pack(side="left")
        see_all = tk.Label(hdr, text="See all →", bg=MAIN_BG, fg=ACCENT,
                           font=self._f(9), cursor="hand2")
        see_all.pack(side="right")
        see_all.bind("<Button-1>", lambda e: self._show_page("Todos"))

        self._dash_todo_frame = tk.Frame(parent, bg=MAIN_BG)
        self._dash_todo_frame.pack(fill="x")

    # ── Dashboard stat card population ────────────────────────────────────────
    def _populate_stat_card(self, frame: tk.Frame, icon: str, value: str,
                             label_text: str, color: str):
        for w in frame.winfo_children():
            w.destroy()
        tk.Label(frame, text=icon, bg=CARD_BG, fg=color,
                 font=self._f(18)).pack(anchor="w")
        tk.Label(frame, text=value, bg=CARD_BG, fg=TEXT_DARK,
                 font=self._f(20, bold=True)).pack(anchor="w", pady=(4, 0))
        tk.Label(frame, text=label_text, bg=CARD_BG, fg=TEXT_LIGHT,
                 font=self._f(8)).pack(anchor="w")

    # =========================================================================
    # PAGE: TODOS
    # =========================================================================
    def _build_todos_page(self, parent: tk.Frame):
        # Header bar
        top = tk.Frame(parent, bg=MAIN_BG)
        top.pack(fill="x", padx=28, pady=(24, 0))
        tk.Label(top, text="My Tasks", bg=MAIN_BG, fg=TEXT_DARK,
                 font=self._f(20, bold=True)).pack(side="left")

        add_btn = tk.Label(top, text="  ➕  Add Task  ", bg=ACCENT, fg="#fff",
                           font=self._f(10), padx=4, pady=6, cursor="hand2")
        add_btn.pack(side="right")
        add_btn.bind("<Button-1>", lambda e: self._quick_add_todo())

        # Filter tabs
        tab_row = tk.Frame(parent, bg=MAIN_BG)
        tab_row.pack(fill="x", padx=28, pady=(12, 0))
        self._todo_filter = tk.StringVar(value="All")
        self._todo_tab_labels: dict[str, tk.Label] = {}
        for tab in ("All", "Pending", "Done", "High", "Medium", "Low"):
            lbl = tk.Label(tab_row, text=tab, font=self._f(9),
                           padx=12, pady=5, cursor="hand2")
            lbl.pack(side="left", padx=(0, 4))
            self._todo_tab_labels[tab] = lbl
            lbl.bind("<Button-1>", lambda e, t=tab: self._set_todo_filter(t))
        self._update_todo_tabs()

        # Search bar
        search_row = tk.Frame(parent, bg=MAIN_BG)
        search_row.pack(fill="x", padx=28, pady=(10, 0))
        self._todo_search = tk.Entry(search_row, bg=CARD_BG, fg=TEXT_DARK,
                                     font=self._f(10), relief="flat",
                                     insertbackground=TEXT_DARK,
                                     highlightbackground=CARD_BORDER,
                                     highlightthickness=1)
        self._todo_search.pack(fill="x", ipady=7)
        self._todo_search.insert(0, "🔍  Search tasks…")
        self._todo_search.config(fg=TEXT_LIGHT)
        self._todo_search.bind("<FocusIn>",  self._search_focus_in)
        self._todo_search.bind("<FocusOut>", self._search_focus_out)
        self._todo_search.bind("<KeyRelease>", lambda e: self._refresh_todos())

        # Scrollable list
        outer, self._todos_inner = scrollable(parent, MAIN_BG)
        outer.pack(fill="both", expand=True, padx=28, pady=12)

    def _search_focus_in(self, e):
        if self._todo_search.get().startswith("🔍"):
            self._todo_search.delete(0, "end")
            self._todo_search.config(fg=TEXT_DARK)

    def _search_focus_out(self, e):
        if not self._todo_search.get():
            self._todo_search.insert(0, "🔍  Search tasks…")
            self._todo_search.config(fg=TEXT_LIGHT)

    def _set_todo_filter(self, tab: str):
        self._todo_filter.set(tab)
        self._update_todo_tabs()
        self._refresh_todos()

    def _update_todo_tabs(self):
        active = self._todo_filter.get()
        for name, lbl in self._todo_tab_labels.items():
            if name == active:
                lbl.config(bg=TEXT_DARK, fg="#ffffff")
            else:
                lbl.config(bg=MAIN_BG, fg=TEXT_MID)

    def _todo_row(self, parent: tk.Frame, todo: dict):
        p_color = {
            "high": P_HIGH, "medium": P_MED, "low": P_LOW
        }.get(todo.get("priority", "medium"), P_MED)

        row = card(parent, padx=14, pady=10)
        row.pack(fill="x", pady=(0, 6))

        # Checkbox-style dot
        done = todo.get("done", False)
        dot_text = "✓" if done else "○"
        dot_color = GREEN if done else p_color
        dot = tk.Label(row, text=dot_text, bg=CARD_BG, fg=dot_color,
                       font=self._f(13), cursor="hand2")
        dot.pack(side="left", padx=(0, 10))
        dot.bind("<Button-1>", lambda e, t=todo: self._toggle_todo(t))

        # Title
        title_fg = TEXT_LIGHT if done else TEXT_DARK
        title_font = tkfont.Font(family="Segoe UI", size=10,
                                 overstrike=done)
        tk.Label(row, text=todo["title"], bg=CARD_BG, fg=title_fg,
                 font=title_font, anchor="w").pack(side="left", fill="x", expand=True)

        # Created date
        created = todo.get("created_at", "")[:10]
        tk.Label(row, text=created, bg=CARD_BG, fg=TEXT_LIGHT,
                 font=self._f(8)).pack(side="right", padx=(8, 0))

        # Priority pill
        pill(row, todo.get("priority", "medium").upper(), p_color).pack(side="right", padx=(8, 0))

        # Delete button
        del_btn = tk.Label(row, text="✕", bg=CARD_BG, fg=TEXT_LIGHT,
                           font=self._f(10), cursor="hand2")
        del_btn.pack(side="right", padx=(8, 0))
        del_btn.bind("<Button-1>", lambda e, t=todo: self._delete_todo(t))

    def _toggle_todo(self, todo: dict):
        from core.tools import update_todo
        update_todo(todo["id"], done=not todo.get("done", False))
        self._refresh_todos()

    def _delete_todo(self, todo: dict):
        if messagebox.askyesno("Delete Task",
                               f"Delete \"{todo['title']}\"?"):
            from core.tools import delete_todo
            delete_todo(todo["id"])
            self._refresh_todos()

    def _quick_add_todo(self):
        title = simpledialog.askstring("Add Task", "Task title:")
        if not title:
            return
        priority = simpledialog.askstring(
            "Priority", "Priority (low / medium / high):", initialvalue="medium")
        priority = priority.strip().lower() if priority else "medium"
        if priority not in ("low", "medium", "high"):
            priority = "medium"
        from core.tools import add_todo
        add_todo(title, priority)
        self._refresh_todos()

    # =========================================================================
    # PAGE: MEMORY
    # =========================================================================
    def _build_memory_page(self, parent: tk.Frame):
        top = tk.Frame(parent, bg=MAIN_BG)
        top.pack(fill="x", padx=28, pady=(24, 0))
        tk.Label(top, text="Memory Bank", bg=MAIN_BG, fg=TEXT_DARK,
                 font=self._f(20, bold=True)).pack(side="left")

        add_btn = tk.Label(top, text="  ➕  Save Memory  ", bg=ACCENT, fg="#fff",
                           font=self._f(10), padx=4, pady=6, cursor="hand2")
        add_btn.pack(side="right")
        add_btn.bind("<Button-1>", lambda e: self._quick_save_memory())

        # Category filter
        cat_row = tk.Frame(parent, bg=MAIN_BG)
        cat_row.pack(fill="x", padx=28, pady=(12, 0))
        self._mem_filter = tk.StringVar(value="All")
        self._mem_tab_labels: dict[str, tk.Label] = {}
        for cat in ("All", "preference", "event", "goal", "general"):
            lbl = tk.Label(cat_row, text=cat.capitalize(), font=self._f(9),
                           padx=12, pady=5, cursor="hand2")
            lbl.pack(side="left", padx=(0, 4))
            self._mem_tab_labels[cat] = lbl
            lbl.bind("<Button-1>", lambda e, c=cat: self._set_mem_filter(c))
        self._update_mem_tabs()

        # Scrollable list
        outer, self._mem_inner = scrollable(parent, MAIN_BG)
        outer.pack(fill="both", expand=True, padx=28, pady=12)

    def _set_mem_filter(self, cat: str):
        self._mem_filter.set(cat)
        self._update_mem_tabs()
        self._refresh_memory()

    def _update_mem_tabs(self):
        active = self._mem_filter.get()
        for name, lbl in self._mem_tab_labels.items():
            if name == active:
                lbl.config(bg=TEXT_DARK, fg="#ffffff")
            else:
                lbl.config(bg=MAIN_BG, fg=TEXT_MID)

    def _quick_save_memory(self):
        content = simpledialog.askstring("Save Memory", "What should I remember?")
        if not content:
            return
        cat = simpledialog.askstring(
            "Category", "Category (preference / event / goal / general):",
            initialvalue="general")
        cat = cat.strip().lower() if cat else "general"
        if cat not in ("preference", "event", "goal", "general"):
            cat = "general"
        from core.memory import save_memory
        save_memory(content, cat)
        self._refresh_memory()

    def _memory_card(self, parent: tk.Frame, mem: dict):
        cat = mem.get("category", "general")
        color = CAT_COLORS.get(cat, "#607d8b")
        c = card(parent, padx=14, pady=12)
        c.pack(fill="x", pady=(0, 8))

        top_row = tk.Frame(c, bg=CARD_BG)
        top_row.pack(fill="x")
        pill(top_row, cat.upper(), color).pack(side="left")
        ts = mem.get("timestamp", "")[:16].replace("T", "  ")
        tk.Label(top_row, text=ts, bg=CARD_BG, fg=TEXT_LIGHT,
                 font=self._f(8)).pack(side="right")

        tk.Label(c, text=mem.get("content", ""), bg=CARD_BG, fg=TEXT_DARK,
                 font=self._f(10), wraplength=700, justify="left",
                 anchor="w").pack(anchor="w", pady=(8, 0))

    # =========================================================================
    # PAGE: STATS
    # =========================================================================
    def _build_stats_page(self, parent: tk.Frame):
        tk.Label(parent, text="Stats & Insights", bg=MAIN_BG, fg=TEXT_DARK,
                 font=self._f(20, bold=True)).pack(anchor="w", padx=28, pady=(24, 16))

        outer, inner = scrollable(parent, MAIN_BG)
        outer.pack(fill="both", expand=True, padx=28, pady=(0, 16))
        self._stats_inner = inner

    def _build_stats_content(self, todos: list[dict], memories: list[dict]):
        inner = self._stats_inner
        for w in inner.winfo_children():
            w.destroy()

        total  = len(todos)
        done   = sum(1 for t in todos if t["done"])
        pending = total - done
        high   = sum(1 for t in todos if t.get("priority") == "high" and not t["done"])

        # ── Top stat cards ────────────────────────────────────────────────────
        row1 = tk.Frame(inner, bg=MAIN_BG)
        row1.pack(fill="x", pady=(0, 14))
        for icon, val, lbl, col in [
            ("📋", str(total),    "Total Tasks",    BLUE),
            ("✅", str(done),     "Completed",      GREEN),
            ("⏳", str(pending),  "Pending",        AMBER),
            ("🔴", str(high),     "High Priority",  RED_SOFT),
            ("🧠", str(len(memories)), "Memories",  "#7c4dff"),
        ]:
            c = card(row1, padx=14, pady=14)
            c.pack(side="left", fill="x", expand=True, padx=(0, 10))
            tk.Label(c, text=icon, bg=CARD_BG, fg=col,
                     font=self._f(20)).pack(anchor="w")
            tk.Label(c, text=val, bg=CARD_BG, fg=TEXT_DARK,
                     font=self._f(22, bold=True)).pack(anchor="w", pady=(4, 0))
            tk.Label(c, text=lbl, bg=CARD_BG, fg=TEXT_LIGHT,
                     font=self._f(8)).pack(anchor="w")

        # ── Bar chart: tasks by priority ──────────────────────────────────────
        chart_card = card(inner, padx=18, pady=16)
        chart_card.pack(fill="x", pady=(0, 14))
        tk.Label(chart_card, text="Tasks by Priority", bg=CARD_BG, fg=TEXT_DARK,
                 font=self._f(12, bold=True)).pack(anchor="w", pady=(0, 12))

        counts = {"high": 0, "medium": 0, "low": 0}
        for t in todos:
            p = t.get("priority", "medium")
            counts[p] = counts.get(p, 0) + 1

        self._draw_bar_chart(chart_card, counts)

        # ── Donut-style completion ring ───────────────────────────────────────
        ring_row = tk.Frame(inner, bg=MAIN_BG)
        ring_row.pack(fill="x", pady=(0, 14))

        ring_card = card(ring_row, padx=18, pady=16)
        ring_card.pack(side="left", fill="both", expand=True, padx=(0, 10))
        tk.Label(ring_card, text="Completion Rate", bg=CARD_BG, fg=TEXT_DARK,
                 font=self._f(12, bold=True)).pack(anchor="w", pady=(0, 10))
        self._draw_ring(ring_card, done, total)

        # ── Memory by category ────────────────────────────────────────────────
        mem_card = card(ring_row, padx=18, pady=16)
        mem_card.pack(side="left", fill="both", expand=True)
        tk.Label(mem_card, text="Memories by Category", bg=CARD_BG, fg=TEXT_DARK,
                 font=self._f(12, bold=True)).pack(anchor="w", pady=(0, 10))
        cat_counts: dict[str, int] = {}
        for m in memories:
            c = m.get("category", "general")
            cat_counts[c] = cat_counts.get(c, 0) + 1
        for cat, cnt in cat_counts.items():
            row = tk.Frame(mem_card, bg=CARD_BG)
            row.pack(fill="x", pady=3)
            color = CAT_COLORS.get(cat, "#607d8b")
            tk.Label(row, text="●", bg=CARD_BG, fg=color,
                     font=self._f(10)).pack(side="left", padx=(0, 6))
            tk.Label(row, text=cat.capitalize(), bg=CARD_BG, fg=TEXT_DARK,
                     font=self._f(10)).pack(side="left")
            tk.Label(row, text=str(cnt), bg=CARD_BG, fg=TEXT_MID,
                     font=self._f(10, bold=True)).pack(side="right")

    def _draw_bar_chart(self, parent: tk.Frame, counts: dict):
        max_val = max(counts.values()) if any(counts.values()) else 1
        chart_h = 120
        bar_w   = 60
        gap     = 30
        colors  = {"high": P_HIGH, "medium": P_MED, "low": P_LOW}
        labels  = list(counts.keys())
        total_w = len(labels) * (bar_w + gap)

        cv = tk.Canvas(parent, bg=CARD_BG, height=chart_h + 40,
                       width=total_w + 40, highlightthickness=0)
        cv.pack(anchor="w")

        for i, lbl in enumerate(labels):
            val = counts[lbl]
            x0 = 20 + i * (bar_w + gap)
            bar_h = int((val / max_val) * chart_h) if max_val else 0
            y0 = chart_h - bar_h + 10
            y1 = chart_h + 10
            cv.create_rectangle(x0, y0, x0 + bar_w, y1,
                                 fill=colors[lbl], outline="")
            cv.create_text(x0 + bar_w // 2, y1 + 14,
                           text=lbl.capitalize(), font=("Segoe UI", 8),
                           fill=TEXT_MID)
            cv.create_text(x0 + bar_w // 2, y0 - 8,
                           text=str(val), font=("Segoe UI", 9, "bold"),
                           fill=TEXT_DARK)

    def _draw_ring(self, parent: tk.Frame, done: int, total: int):
        size = 140
        cv = tk.Canvas(parent, bg=CARD_BG, width=size, height=size,
                       highlightthickness=0)
        cv.pack()
        pct = done / total if total else 0
        extent = pct * 359.9
        # Background ring
        cv.create_arc(14, 14, size - 14, size - 14,
                      start=90, extent=359.9,
                      style="arc", outline="#eeeeee", width=16)
        # Filled arc
        if extent > 0:
            cv.create_arc(14, 14, size - 14, size - 14,
                          start=90, extent=-extent,
                          style="arc", outline=ACCENT, width=16)
        cv.create_text(size // 2, size // 2 - 8,
                       text=f"{int(pct * 100)}%",
                       font=("Segoe UI", 18, "bold"), fill=TEXT_DARK)
        cv.create_text(size // 2, size // 2 + 14,
                       text=f"{done}/{total} done",
                       font=("Segoe UI", 8), fill=TEXT_LIGHT)

    # =========================================================================
    # PAGE: PROFILE
    # =========================================================================
    def _build_profile_page(self, parent: tk.Frame):
        outer, inner = scrollable(parent, MAIN_BG)
        outer.pack(fill="both", expand=True, padx=28, pady=24)

        # Avatar + name
        av_card = card(inner, padx=24, pady=24)
        av_card.pack(fill="x", pady=(0, 16))
        av_row = tk.Frame(av_card, bg=CARD_BG)
        av_row.pack(anchor="w")

        # Avatar circle (canvas)
        av_cv = tk.Canvas(av_row, bg=CARD_BG, width=72, height=72,
                          highlightthickness=0)
        av_cv.pack(side="left", padx=(0, 18))
        av_cv.create_oval(4, 4, 68, 68, fill=ACCENT, outline="")
        av_cv.create_text(36, 36, text="👤", font=("Segoe UI", 24), fill="#fff")

        info = tk.Frame(av_row, bg=CARD_BG)
        info.pack(side="left")
        tk.Label(info, text="Voice Agent User", bg=CARD_BG, fg=TEXT_DARK,
                 font=self._f(16, bold=True)).pack(anchor="w")
        tk.Label(info, text="Powered by Groq  ·  llama-3.3-70b-versatile",
                 bg=CARD_BG, fg=TEXT_LIGHT, font=self._f(9)).pack(anchor="w", pady=(4, 0))

        # Stats summary
        from core.tools import list_todos
        from core.memory import _load as load_mem
        todos = list_todos()["todos"]
        mems  = load_mem()
        done  = sum(1 for t in todos if t["done"])

        stats_row = tk.Frame(av_card, bg=CARD_BG)
        stats_row.pack(fill="x", pady=(18, 0))
        for val, lbl in [
            (str(len(todos)), "Total Tasks"),
            (str(done),       "Completed"),
            (str(len(mems)),  "Memories"),
        ]:
            col = tk.Frame(stats_row, bg=CARD_BG)
            col.pack(side="left", padx=(0, 40))
            tk.Label(col, text=val, bg=CARD_BG, fg=TEXT_DARK,
                     font=self._f(20, bold=True)).pack()
            tk.Label(col, text=lbl, bg=CARD_BG, fg=TEXT_LIGHT,
                     font=self._f(8)).pack()

        # Recent memories preview
        mem_card = card(inner, padx=18, pady=16)
        mem_card.pack(fill="x", pady=(0, 16))
        tk.Label(mem_card, text="Recent Memories", bg=CARD_BG, fg=TEXT_DARK,
                 font=self._f(12, bold=True)).pack(anchor="w", pady=(0, 10))
        for m in mems[-5:][::-1]:
            row = tk.Frame(mem_card, bg=CARD_BG)
            row.pack(fill="x", pady=3)
            color = CAT_COLORS.get(m.get("category", "general"), "#607d8b")
            pill(row, m.get("category", "general").upper(), color).pack(side="left", padx=(0, 8))
            tk.Label(row, text=m.get("content", ""), bg=CARD_BG, fg=TEXT_DARK,
                     font=self._f(9), wraplength=500, justify="left").pack(side="left")

    # =========================================================================
    # PAGE: SETTINGS
    # =========================================================================
    def _build_settings_page(self, parent: tk.Frame):
        outer, inner = scrollable(parent, MAIN_BG)
        outer.pack(fill="both", expand=True, padx=28, pady=24)

        tk.Label(inner, text="Settings", bg=MAIN_BG, fg=TEXT_DARK,
                 font=self._f(20, bold=True)).pack(anchor="w", pady=(0, 16))

        # API key section
        api_card = card(inner, padx=18, pady=16)
        api_card.pack(fill="x", pady=(0, 14))
        tk.Label(api_card, text="🔑  Groq API Key", bg=CARD_BG, fg=TEXT_DARK,
                 font=self._f(11, bold=True)).pack(anchor="w")
        tk.Label(api_card, text="Set GROQ_API_KEY in your .env file.",
                 bg=CARD_BG, fg=TEXT_LIGHT, font=self._f(9)).pack(anchor="w", pady=(4, 10))
        api_key = os.getenv("GROQ_API_KEY", "")
        masked = ("*" * 20 + api_key[-6:]) if len(api_key) > 6 else ("Not set" if not api_key else api_key)
        tk.Label(api_card, text=masked, bg="#f5f5f5", fg=TEXT_MID,
                 font=self._f(9), padx=10, pady=6).pack(anchor="w")

        # Model info
        model_card = card(inner, padx=18, pady=16)
        model_card.pack(fill="x", pady=(0, 14))
        tk.Label(model_card, text="🤖  Model", bg=CARD_BG, fg=TEXT_DARK,
                 font=self._f(11, bold=True)).pack(anchor="w")
        tk.Label(model_card, text="llama-3.3-70b-versatile  (via Groq)",
                 bg=CARD_BG, fg=TEXT_MID, font=self._f(10)).pack(anchor="w", pady=(6, 0))

        # Voice settings
        voice_card = card(inner, padx=18, pady=16)
        voice_card.pack(fill="x", pady=(0, 14))
        tk.Label(voice_card, text="🎤  Voice", bg=CARD_BG, fg=TEXT_DARK,
                 font=self._f(11, bold=True)).pack(anchor="w")
        for line in [
            "STT: Groq Whisper large-v3",
            "TTS: pyttsx3 (local, offline)",
            "Silence threshold: 1.8 s",
            "Max recording: 30 s",
        ]:
            tk.Label(voice_card, text=f"  • {line}", bg=CARD_BG, fg=TEXT_MID,
                     font=self._f(9)).pack(anchor="w", pady=2)

        # Data files
        data_card = card(inner, padx=18, pady=16)
        data_card.pack(fill="x", pady=(0, 14))
        tk.Label(data_card, text="💾  Data Files", bg=CARD_BG, fg=TEXT_DARK,
                 font=self._f(11, bold=True)).pack(anchor="w")
        data_dir = Path(__file__).parent.parent / "data"
        for fname in ("todos.json", "memory.json", "conversation.json"):
            fpath = data_dir / fname
            exists = "✓" if fpath.exists() else "✗"
            color  = GREEN if fpath.exists() else RED_SOFT
            row = tk.Frame(data_card, bg=CARD_BG)
            row.pack(fill="x", pady=3)
            tk.Label(row, text=exists, bg=CARD_BG, fg=color,
                     font=self._f(10)).pack(side="left", padx=(0, 8))
            tk.Label(row, text=str(fpath), bg=CARD_BG, fg=TEXT_MID,
                     font=self._f(8)).pack(side="left")

        # Danger zone
        danger_card = card(inner, padx=18, pady=16)
        danger_card.pack(fill="x", pady=(0, 14))
        tk.Label(danger_card, text="⚠️  Danger Zone", bg=CARD_BG, fg=RED_SOFT,
                 font=self._f(11, bold=True)).pack(anchor="w", pady=(0, 10))
        for lbl_text, cmd in [
            ("Clear all todos",        self._clear_todos),
            ("Clear all memories",     self._clear_memories),
            ("Clear conversation history", self._clear_conversation),
        ]:
            btn = tk.Label(danger_card, text=lbl_text, bg="#fff0ee",
                           fg=RED_SOFT, font=self._f(9), padx=12, pady=6,
                           cursor="hand2")
            btn.pack(anchor="w", pady=3)
            btn.bind("<Button-1>", lambda e, c=cmd: c())

    def _clear_todos(self):
        if messagebox.askyesno("Clear Todos", "Delete ALL todos? This cannot be undone."):
            from core.tools import TODO_FILE
            if TODO_FILE.exists():
                TODO_FILE.write_text("[]")
            self._refresh_todos()

    def _clear_memories(self):
        if messagebox.askyesno("Clear Memories", "Delete ALL memories? This cannot be undone."):
            from core.memory import MEMORY_FILE
            if MEMORY_FILE.exists():
                MEMORY_FILE.write_text("[]")
            self._refresh_memory()

    def _clear_conversation(self):
        if messagebox.askyesno("Clear History", "Clear conversation history?"):
            self._conversation = []
            self._save_conversation()

    # =========================================================================
    # CHAT PANEL (right side of Dashboard)
    # =========================================================================
    def _build_chat_panel(self, parent: tk.Frame):
        # Header
        hdr = tk.Frame(parent, bg=CARD_BG, pady=14)
        hdr.pack(fill="x", padx=14)
        tk.Label(hdr, text="🤖  AI Chatbot", bg=ACCENT, fg="#fff",
                 font=self._f(10, bold=True), padx=12, pady=6).pack(side="left")
        self._status_lbl = tk.Label(hdr, text="", bg=CARD_BG, fg=TEXT_LIGHT,
                                    font=self._f(8))
        self._status_lbl.pack(side="right")

        tk.Frame(parent, bg=CARD_BORDER, height=1).pack(fill="x")

        # Messages
        msg_outer = tk.Frame(parent, bg=CARD_BG)
        msg_outer.pack(fill="both", expand=True, padx=6, pady=6)

        self._chat_canvas = tk.Canvas(msg_outer, bg=CARD_BG, highlightthickness=0)
        chat_sb = tk.Scrollbar(msg_outer, orient="vertical",
                               command=self._chat_canvas.yview)
        self._chat_inner = tk.Frame(self._chat_canvas, bg=CARD_BG)
        self._chat_inner.bind("<Configure>",
            lambda e: self._chat_canvas.configure(
                scrollregion=self._chat_canvas.bbox("all")))
        self._chat_canvas.create_window((0, 0), window=self._chat_inner, anchor="nw")
        self._chat_canvas.configure(yscrollcommand=chat_sb.set)
        self._chat_canvas.pack(side="left", fill="both", expand=True)
        chat_sb.pack(side="right", fill="y")

        # Input row
        tk.Frame(parent, bg=CARD_BORDER, height=1).pack(fill="x")
        inp_row = tk.Frame(parent, bg=CARD_BG, pady=10)
        inp_row.pack(fill="x", padx=12, pady=(0, 10))

        self._chat_entry = tk.Entry(inp_row, bg=INPUT_BG, fg=TEXT_DARK,
                                    font=self._f(10), relief="flat",
                                    insertbackground=TEXT_DARK,
                                    highlightbackground=CARD_BORDER,
                                    highlightthickness=1)
        self._chat_entry.pack(side="left", fill="x", expand=True, ipady=8, padx=(0, 8))
        self._chat_entry.insert(0, "Type something…")
        self._chat_entry.config(fg=TEXT_LIGHT)
        self._chat_entry.bind("<FocusIn>",  self._chat_focus_in)
        self._chat_entry.bind("<FocusOut>", self._chat_focus_out)
        self._chat_entry.bind("<Return>",   self._on_send)

        self._mic_btn = tk.Label(inp_row, text="🎤", bg=ACCENT, fg="#fff",
                                 font=self._f(14), padx=10, pady=6, cursor="hand2")
        self._mic_btn.pack(side="right")
        self._mic_btn.bind("<Button-1>", self._on_mic)

        # Welcome bubble
        self._bubble("Hello! I'm your voice todo assistant.\nAsk me to add tasks, list todos, or remember something.", "assistant")

    def _chat_focus_in(self, e):
        if self._chat_entry.get() == "Type something…":
            self._chat_entry.delete(0, "end")
            self._chat_entry.config(fg=TEXT_DARK)

    def _chat_focus_out(self, e):
        if not self._chat_entry.get():
            self._chat_entry.insert(0, "Type something…")
            self._chat_entry.config(fg=TEXT_LIGHT)

    def _bubble(self, text: str, role: str):
        is_user = role == "user"
        outer = tk.Frame(self._chat_inner, bg=CARD_BG)
        outer.pack(fill="x", pady=4, padx=8)

        bubble_bg = "#e8f0fe" if is_user else "#f5f5f5"
        bubble = tk.Frame(outer, bg=bubble_bg, padx=10, pady=8)
        bubble.pack(side="right" if is_user else "left",
                    anchor="e" if is_user else "w")

        tk.Label(bubble, text=text, bg=bubble_bg, fg=TEXT_DARK,
                 font=self._f(9), wraplength=250, justify="left").pack(anchor="w")

        ts = datetime.now().strftime("%H:%M")
        tk.Label(outer, text=ts, bg=CARD_BG, fg=TEXT_LIGHT,
                 font=self._f(7)).pack(
                     side="right" if is_user else "left", pady=(2, 0))

        self._chat_canvas.update_idletasks()
        self._chat_canvas.yview_moveto(1.0)

    def _set_status(self, msg: str):
        self._status_lbl.config(text=msg)
        self.update_idletasks()

    # ── Send text ─────────────────────────────────────────────────────────────
    def _on_send(self, event=None):
        text = self._chat_entry.get().strip()
        if not text or text == "Type something…":
            return
        self._chat_entry.delete(0, "end")
        self._bubble(text, "user")
        threading.Thread(target=self._agent_call, args=(text,), daemon=True).start()

    # ── Mic ───────────────────────────────────────────────────────────────────
    def _on_mic(self, event=None):
        if self._listening:
            return
        self._listening = True
        self._mic_btn.config(bg="#c0392b", text="⏹")
        self._set_status("🎤 Listening…")
        threading.Thread(target=self._record_and_send, daemon=True).start()

    def _record_and_send(self):
        try:
            from core.voice import record_until_silence, transcribe
            audio = record_until_silence()
            self.after(0, self._set_status, "🔄 Transcribing…")
            client = self._get_client()
            if not client:
                return
            text = transcribe(client, audio)
            if not text:
                self.after(0, self._set_status, "❌ Didn't catch that.")
                return
            self.after(0, self._bubble, text, "user")
            self._agent_call(text)
        except Exception as ex:
            self.after(0, self._set_status, f"⚠️ {ex}")
        finally:
            self._listening = False
            self.after(0, self._mic_btn.config, {"bg": ACCENT, "text": "🎤"})

    # ── Agent call ────────────────────────────────────────────────────────────
    def _agent_call(self, text: str):
        self.after(0, self._set_status, "🤖 Thinking…")
        try:
            from core.agent import run_agent_turn
            client = self._get_client()
            if not client:
                return
            reply = run_agent_turn(client, self._conversation, text)
            self.after(0, self._bubble, reply, "assistant")
            self.after(0, self._save_conversation)
            self.after(0, self._refresh_todos)
            self.after(0, self._set_status, "")
            threading.Thread(target=self._speak, args=(reply,), daemon=True).start()
        except Exception as ex:
            self.after(0, self._bubble, f"⚠️ {ex}", "assistant")
            self.after(0, self._set_status, "")

    def _speak(self, text: str):
        try:
            from core.voice import speak
            speak(text)
        except Exception:
            pass

    def _get_client(self):
        if self._groq_client:
            return self._groq_client
        from groq import Groq
        key = os.getenv("GROQ_API_KEY", "")
        if not key:
            self.after(0, self._bubble,
                       "❌ GROQ_API_KEY not set in .env", "assistant")
            return None
        self._groq_client = Groq(api_key=key)
        return self._groq_client

    # =========================================================================
    # DATA REFRESH
    # =========================================================================
    def _refresh_todos(self):
        from core.tools import list_todos
        all_todos = list_todos()["todos"]
        total = len(all_todos)
        done  = sum(1 for t in all_todos if t["done"])
        pct   = done / total if total else 0

        # ── Dashboard stat cards ──────────────────────────────────────────────
        if hasattr(self, "_dash_stat_frames"):
            data = [
                ("📋", str(total),          "Total Tasks",   BLUE),
                ("✅", str(done),            "Completed",     GREEN),
                ("⏳", str(total - done),    "Pending",       AMBER),
                ("🔴", str(sum(1 for t in all_todos
                               if t.get("priority") == "high"
                               and not t["done"])), "High Priority", RED_SOFT),
            ]
            for frame, (icon, val, lbl, col) in zip(self._dash_stat_frames, data):
                self._populate_stat_card(frame, icon, val, lbl, col)

        # ── Progress bar ──────────────────────────────────────────────────────
        if hasattr(self, "_prog_title"):
            if total:
                self._prog_title.config(
                    text=f"You're {int(pct * 100)}% to your daily goal")
                self._prog_sub.config(text=f"{done} / {total} tasks complete")
            else:
                self._prog_title.config(text="No tasks yet — add one!")
                self._prog_sub.config(text="")
            self._prog_bar.place(relwidth=pct)

        # ── Dashboard recent todos (last 5) ───────────────────────────────────
        if hasattr(self, "_dash_todo_frame"):
            for w in self._dash_todo_frame.winfo_children():
                w.destroy()
            recent = all_todos[-5:][::-1]
            if not recent:
                tk.Label(self._dash_todo_frame, text="No tasks yet.",
                         bg=MAIN_BG, fg=TEXT_LIGHT, font=self._f(9)).pack(pady=10)
            for t in recent:
                self._todo_row(self._dash_todo_frame, t)

        # ── Todos page ────────────────────────────────────────────────────────
        if hasattr(self, "_todos_inner"):
            for w in self._todos_inner.winfo_children():
                w.destroy()
            tab = self._todo_filter.get() if hasattr(self, "_todo_filter") else "All"
            search_raw = self._todo_search.get() if hasattr(self, "_todo_search") else ""
            search = "" if search_raw.startswith("🔍") else search_raw.lower()

            filtered = all_todos
            if tab == "Pending":
                filtered = [t for t in filtered if not t["done"]]
            elif tab == "Done":
                filtered = [t for t in filtered if t["done"]]
            elif tab in ("High", "Medium", "Low"):
                filtered = [t for t in filtered if t.get("priority", "").lower() == tab.lower()]
            if search:
                filtered = [t for t in filtered if search in t["title"].lower()]

            if not filtered:
                tk.Label(self._todos_inner, text="No tasks match.",
                         bg=MAIN_BG, fg=TEXT_LIGHT, font=self._f(10)).pack(pady=20)
            for t in filtered:
                self._todo_row(self._todos_inner, t)

    def _refresh_memory(self):
        if not hasattr(self, "_mem_inner"):
            return
        from core.memory import _load as load_mem
        mems = load_mem()
        cat_filter = self._mem_filter.get() if hasattr(self, "_mem_filter") else "All"
        if cat_filter != "All":
            mems = [m for m in mems if m.get("category") == cat_filter]
        mems = mems[::-1]  # newest first

        for w in self._mem_inner.winfo_children():
            w.destroy()
        if not mems:
            tk.Label(self._mem_inner, text="No memories stored yet.",
                     bg=MAIN_BG, fg=TEXT_LIGHT, font=self._f(10)).pack(pady=20)
            return
        for m in mems:
            self._memory_card(self._mem_inner, m)

    def _refresh_stats(self):
        if not hasattr(self, "_stats_inner"):
            return
        from core.tools import list_todos
        from core.memory import _load as load_mem
        todos = list_todos()["todos"]
        mems  = load_mem()
        self._build_stats_content(todos, mems)

    def _schedule_refresh(self):
        self._refresh_todos()
        self.after(5000, self._schedule_refresh)

    # ── Persistence ───────────────────────────────────────────────────────────
    def _load_conversation(self):
        f = Path(__file__).parent.parent / "data" / "conversation.json"
        if f.exists():
            try:
                self._conversation = json.loads(f.read_text())
            except Exception:
                self._conversation = []

    def _save_conversation(self):
        f = Path(__file__).parent.parent / "data" / "conversation.json"
        f.parent.mkdir(exist_ok=True)
        f.write_text(json.dumps(
            [m for m in self._conversation if isinstance(m, dict)], indent=2))


# ─────────────────────────────────────────────────────────────────────────────
# ENTRY POINT
# ─────────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    app = App()
    app.mainloop()

