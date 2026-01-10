#!/usr/bin/env python3
"""
Site Editor - Unified editor for Blog, Projects, and About pages
Supports clipboard image pasting (Ctrl+V)
"""

import tkinter as tk
from tkinter import ttk, messagebox, filedialog, scrolledtext, simpledialog
import json
import os
import shutil
import re
from datetime import datetime
from pathlib import Path
from io import BytesIO

# Try to import PIL for clipboard image support
try:
    from PIL import Image, ImageGrab
    HAS_PIL = True
except ImportError:
    HAS_PIL = False

# Paths
SCRIPT_DIR = Path(__file__).parent
BASE_PATH = SCRIPT_DIR.parent
POSTS_PATH = BASE_PATH / "data" / "posts"
INDEX_FILE = POSTS_PATH / "index.json"
PROJECTS_FILE = BASE_PATH / "data" / "projects.json"
ABOUT_FILE = BASE_PATH / "pages" / "about.html"

# Colors
COLORS = {
    "bg_dark": "#1e1e1e",
    "bg_medium": "#252526",
    "bg_light": "#333333",
    "fg_light": "#cccccc",
    "fg_white": "#ffffff",
    "accent_cyan": "#00ffff",
    "accent_pink": "#ff6b9d",
    "accent_purple": "#9d6bff",
}


class SiteEditor:
    def __init__(self, root):
        self.root = root
        self.root.title("Site Editor")
        self.root.geometry("1400x900")
        self.root.configure(bg=COLORS["bg_dark"])
        
        self.setup_styles()
        self.create_layout()
        
        # Global shortcuts
        self.root.bind("<Control-s>", self.save_current)
        
    def setup_styles(self):
        style = ttk.Style()
        style.theme_use("clam")
        
        style.configure("TFrame", background=COLORS["bg_dark"])
        style.configure("TLabel", background=COLORS["bg_dark"], foreground=COLORS["fg_light"], font=("Segoe UI", 10))
        style.configure("TButton", background=COLORS["bg_light"], foreground=COLORS["fg_light"], font=("Segoe UI", 10))
        style.configure("Header.TLabel", font=("Segoe UI", 12, "bold"), foreground=COLORS["accent_cyan"])
        style.configure("TNotebook", background=COLORS["bg_dark"])
        style.configure("TNotebook.Tab", background=COLORS["bg_light"], foreground=COLORS["fg_light"], padding=[15, 8])
        style.map("TNotebook.Tab", background=[("selected", COLORS["bg_medium"])])
        
    def create_layout(self):
        # Main notebook with tabs
        self.notebook = ttk.Notebook(self.root)
        self.notebook.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)
        
        # Create tabs
        self.blog_tab = BlogTab(self.notebook)
        self.projects_tab = ProjectsTab(self.notebook)
        self.about_tab = AboutTab(self.notebook)
        
        self.notebook.add(self.blog_tab.frame, text="  📝 Blog  ")
        self.notebook.add(self.projects_tab.frame, text="  🚀 Projects  ")
        self.notebook.add(self.about_tab.frame, text="  👤 About  ")
        
        # Status bar
        self.status_var = tk.StringVar(value="Ready • Ctrl+V to paste images • Ctrl+S to save")
        status_bar = ttk.Label(self.root, textvariable=self.status_var, anchor=tk.W)
        status_bar.pack(fill=tk.X, padx=10, pady=5)
        
    def save_current(self, event=None):
        """Save current tab's content"""
        current = self.notebook.index(self.notebook.select())
        if current == 0:
            self.blog_tab.save_post()
        elif current == 1:
            self.projects_tab.save_all()
        elif current == 2:
            self.about_tab.save_about()


class BlogTab:
    def __init__(self, parent):
        self.frame = ttk.Frame(parent)
        self.current_post_id = None
        self.is_modified = False
        
        self.create_layout()
        self.refresh_posts_list()
        
    def create_layout(self):
        main_frame = ttk.Frame(self.frame)
        main_frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
        
        # Left panel - Posts list
        left_panel = ttk.Frame(main_frame, width=280)
        left_panel.pack(side=tk.LEFT, fill=tk.Y, padx=(0, 10))
        left_panel.pack_propagate(False)
        
        ttk.Label(left_panel, text="Posts", style="Header.TLabel").pack(anchor=tk.W, pady=(0, 10))
        
        self.posts_listbox = tk.Listbox(
            left_panel, bg=COLORS["bg_medium"], fg=COLORS["fg_light"],
            selectbackground=COLORS["accent_cyan"], selectforeground="#000000",
            font=("Segoe UI", 10), borderwidth=0, highlightthickness=1,
            highlightcolor=COLORS["accent_cyan"]
        )
        self.posts_listbox.pack(fill=tk.BOTH, expand=True)
        self.posts_listbox.bind("<<ListboxSelect>>", self.on_post_select)
        
        btn_frame = ttk.Frame(left_panel)
        btn_frame.pack(fill=tk.X, pady=(10, 0))
        ttk.Button(btn_frame, text="+ New", command=self.new_post).pack(side=tk.LEFT, expand=True, fill=tk.X, padx=(0, 2))
        ttk.Button(btn_frame, text="🗑 Delete", command=self.delete_post).pack(side=tk.LEFT, expand=True, fill=tk.X, padx=(2, 0))
        
        # Right panel - Editor
        right_panel = ttk.Frame(main_frame)
        right_panel.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        
        # Metadata
        meta_frame = ttk.Frame(right_panel)
        meta_frame.pack(fill=tk.X, pady=(0, 10))
        meta_frame.columnconfigure(1, weight=1)
        
        ttk.Label(meta_frame, text="Title:").grid(row=0, column=0, sticky=tk.W, pady=2)
        self.title_var = tk.StringVar()
        self.title_entry = tk.Entry(meta_frame, textvariable=self.title_var, bg=COLORS["bg_medium"],
                                     fg=COLORS["fg_white"], insertbackground=COLORS["fg_white"],
                                     font=("Segoe UI", 12), borderwidth=0)
        self.title_entry.grid(row=0, column=1, sticky=tk.EW, pady=2, padx=(10, 0))
        self.title_var.trace_add("write", lambda *args: self.mark_modified())
        
        ttk.Label(meta_frame, text="ID:").grid(row=1, column=0, sticky=tk.W, pady=2)
        self.id_var = tk.StringVar()
        ttk.Label(meta_frame, textvariable=self.id_var).grid(row=1, column=1, sticky=tk.W, pady=2, padx=(10, 0))
        
        ttk.Label(meta_frame, text="Tags:").grid(row=2, column=0, sticky=tk.W, pady=2)
        self.tags_var = tk.StringVar()
        tk.Entry(meta_frame, textvariable=self.tags_var, bg=COLORS["bg_medium"], fg=COLORS["fg_white"],
                 insertbackground=COLORS["fg_white"], font=("Segoe UI", 10), borderwidth=0).grid(row=2, column=1, sticky=tk.EW, pady=2, padx=(10, 0))
        
        self.featured_var = tk.BooleanVar()
        tk.Checkbutton(meta_frame, text="Featured", variable=self.featured_var, bg=COLORS["bg_dark"],
                       fg=COLORS["fg_light"], selectcolor=COLORS["bg_medium"]).grid(row=3, column=1, sticky=tk.W, pady=2, padx=(10, 0))
        
        # Summary
        ttk.Label(right_panel, text="Summary:").pack(anchor=tk.W)
        self.summary_text = tk.Text(right_panel, height=2, bg=COLORS["bg_medium"], fg=COLORS["fg_white"],
                                     insertbackground=COLORS["fg_white"], font=("Segoe UI", 10), borderwidth=0, wrap=tk.WORD)
        self.summary_text.pack(fill=tk.X, pady=(5, 10))
        
        # Content toolbar
        toolbar = ttk.Frame(right_panel)
        toolbar.pack(fill=tk.X, pady=(0, 5))
        
        ttk.Label(toolbar, text="Content (Markdown):", style="Header.TLabel").pack(side=tk.LEFT)
        
        for text, cmd in [("B", lambda: self.insert_format("**", "**")), ("I", lambda: self.insert_format("*", "*")),
                          ("</>", lambda: self.insert_format("`", "`")), ("H2", lambda: self.insert_line_start("## ")),
                          ("H3", lambda: self.insert_line_start("### ")), ("•", lambda: self.insert_line_start("- ")),
                          ("🔗", self.insert_link), ("🖼", self.insert_image), ("```", self.insert_code_block)]:
            ttk.Button(toolbar, text=text, width=4 if len(text) > 2 else 3, command=cmd).pack(side=tk.LEFT, padx=2)
        
        save_btn = tk.Button(toolbar, text="💾 Save (Ctrl+S)", command=self.save_post, bg=COLORS["accent_cyan"],
                             fg="#000000", font=("Segoe UI", 10, "bold"), borderwidth=0, padx=10)
        save_btn.pack(side=tk.RIGHT)
        
        # Content text
        self.content_text = scrolledtext.ScrolledText(right_panel, bg="#1a1a1a", fg="#e0e0e0",
                                                       insertbackground=COLORS["accent_cyan"], font=("Consolas", 11),
                                                       borderwidth=0, wrap=tk.WORD, undo=True)
        self.content_text.pack(fill=tk.BOTH, expand=True)
        
        # Bind Ctrl+V for image paste
        self.content_text.bind("<Control-v>", self.handle_paste)
        
    def handle_paste(self, event):
        """Handle paste - check for images in clipboard"""
        if not HAS_PIL:
            return  # Let default paste happen
        
        try:
            img = ImageGrab.grabclipboard()
            if isinstance(img, Image.Image):
                self.paste_image(img)
                return "break"  # Prevent default paste
        except Exception:
            pass  # Let default paste happen
        
    def paste_image(self, img):
        """Paste image from clipboard"""
        if not self.current_post_id:
            title = self.title_var.get().strip()
            if not title:
                messagebox.showwarning("Warning", "Enter a title first to paste images")
                return
            self.current_post_id = self.generate_id(title)
        
        # Save image
        images_dir = POSTS_PATH / self.current_post_id / "images"
        images_dir.mkdir(parents=True, exist_ok=True)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"pasted_{timestamp}.png"
        filepath = images_dir / filename
        
        img.save(filepath, "PNG")
        
        # Insert markdown
        alt = simpledialog.askstring("Alt Text", "Enter alt text for the image:", parent=self.frame)
        if alt is None:
            alt = "image"
        
        self.content_text.insert(tk.INSERT, f"\n![{alt}](images/{filename})\n")
        self.mark_modified()
        
    def refresh_posts_list(self):
        self.posts_listbox.delete(0, tk.END)
        if not INDEX_FILE.exists():
            return
        with open(INDEX_FILE, "r", encoding="utf-8") as f:
            index = json.load(f)
        for post_id in index.get("posts", []):
            post_file = POSTS_PATH / post_id / "post.json"
            if post_file.exists():
                with open(post_file, "r", encoding="utf-8") as f:
                    post = json.load(f)
                self.posts_listbox.insert(tk.END, f"{post.get('title', post_id)}")
                
    def on_post_select(self, event):
        selection = self.posts_listbox.curselection()
        if not selection:
            return
        with open(INDEX_FILE, "r", encoding="utf-8") as f:
            index = json.load(f)
        post_id = index["posts"][selection[0]]
        self.load_post(post_id)
        
    def load_post(self, post_id):
        post_file = POSTS_PATH / post_id / "post.json"
        with open(post_file, "r", encoding="utf-8") as f:
            post = json.load(f)
        self.current_post_id = post_id
        self.title_var.set(post.get("title", ""))
        self.id_var.set(post_id)
        self.tags_var.set(", ".join(post.get("tags", [])))
        self.featured_var.set(post.get("featured", False))
        self.summary_text.delete("1.0", tk.END)
        self.summary_text.insert("1.0", post.get("summary", ""))
        self.content_text.delete("1.0", tk.END)
        self.content_text.insert("1.0", post.get("content", ""))
        self.is_modified = False
        
    def new_post(self):
        self.current_post_id = None
        self.title_var.set("")
        self.id_var.set("(auto-generated)")
        self.tags_var.set("")
        self.featured_var.set(False)
        self.summary_text.delete("1.0", tk.END)
        self.content_text.delete("1.0", tk.END)
        self.is_modified = False
        self.title_entry.focus()
        
    def generate_id(self, title):
        id_str = title.lower().strip()
        id_str = re.sub(r'[^a-z0-9\s-]', '', id_str)
        id_str = re.sub(r'[\s_]+', '-', id_str)
        return re.sub(r'-+', '-', id_str).strip('-')
        
    def save_post(self):
        title = self.title_var.get().strip()
        summary = self.summary_text.get("1.0", tk.END).strip()
        content = self.content_text.get("1.0", tk.END).strip()
        
        if not title or not summary or not content:
            messagebox.showerror("Error", "Title, summary and content are required")
            return
        
        post_id = self.current_post_id or self.generate_id(title)
        if not post_id:
            messagebox.showerror("Error", "Could not generate valid ID")
            return
        
        post_dir = POSTS_PATH / post_id
        if not self.current_post_id and post_dir.exists():
            messagebox.showerror("Error", f"Post '{post_id}' already exists")
            return
        
        tags = [t.strip() for t in self.tags_var.get().split(",") if t.strip()]
        
        # Get existing date or create new
        existing_date = None
        if self.current_post_id:
            old_file = POSTS_PATH / self.current_post_id / "post.json"
            if old_file.exists():
                with open(old_file, "r", encoding="utf-8") as f:
                    existing_date = json.load(f).get("date")
        
        post_data = {
            "id": post_id,
            "title": title,
            "date": existing_date or datetime.now().strftime("%Y-%m-%d"),
            "summary": summary,
            "content": content,
            "tags": tags,
            "featured": self.featured_var.get()
        }
        
        post_dir.mkdir(parents=True, exist_ok=True)
        (post_dir / "images").mkdir(exist_ok=True)
        
        with open(post_dir / "post.json", "w", encoding="utf-8") as f:
            json.dump(post_data, f, indent=4, ensure_ascii=False)
        
        # Update index
        if INDEX_FILE.exists():
            with open(INDEX_FILE, "r", encoding="utf-8") as f:
                index = json.load(f)
        else:
            index = {"posts": []}
        if post_id not in index["posts"]:
            index["posts"].insert(0, post_id)
        with open(INDEX_FILE, "w", encoding="utf-8") as f:
            json.dump(index, f, indent=4)
        
        self.current_post_id = post_id
        self.id_var.set(post_id)
        self.is_modified = False
        self.refresh_posts_list()
        messagebox.showinfo("Saved", f"Post saved: {title}")
        
    def delete_post(self):
        if not self.current_post_id:
            return
        if not messagebox.askyesno("Delete", f"Delete '{self.title_var.get()}'?"):
            return
        
        post_dir = POSTS_PATH / self.current_post_id
        if INDEX_FILE.exists():
            with open(INDEX_FILE, "r", encoding="utf-8") as f:
                index = json.load(f)
            if self.current_post_id in index["posts"]:
                index["posts"].remove(self.current_post_id)
            with open(INDEX_FILE, "w", encoding="utf-8") as f:
                json.dump(index, f, indent=4)
        if post_dir.exists():
            shutil.rmtree(post_dir)
        self.new_post()
        self.refresh_posts_list()
        
    def mark_modified(self):
        self.is_modified = True
        title = self.title_var.get()
        if title and not self.current_post_id:
            self.id_var.set(self.generate_id(title))
            
    def insert_format(self, before, after):
        try:
            selected = self.content_text.get(tk.SEL_FIRST, tk.SEL_LAST)
            self.content_text.delete(tk.SEL_FIRST, tk.SEL_LAST)
            self.content_text.insert(tk.INSERT, f"{before}{selected}{after}")
        except tk.TclError:
            self.content_text.insert(tk.INSERT, f"{before}{after}")
        self.mark_modified()
        
    def insert_line_start(self, prefix):
        line_start = self.content_text.index("insert linestart")
        self.content_text.insert(line_start, prefix)
        self.mark_modified()
        
    def insert_link(self):
        text = simpledialog.askstring("Link", "Link text:", parent=self.frame)
        if not text:
            return
        url = simpledialog.askstring("Link", "URL:", parent=self.frame)
        if url:
            self.content_text.insert(tk.INSERT, f"[{text}]({url})")
            self.mark_modified()
            
    def insert_image(self):
        if not self.current_post_id:
            title = self.title_var.get().strip()
            if not title:
                messagebox.showwarning("Warning", "Enter a title first")
                return
            self.current_post_id = self.generate_id(title)
        
        file_path = filedialog.askopenfilename(
            title="Select Image",
            filetypes=[("Image files", "*.png *.jpg *.jpeg *.gif *.webp"), ("All files", "*.*")]
        )
        if not file_path:
            return
        
        images_dir = POSTS_PATH / self.current_post_id / "images"
        images_dir.mkdir(parents=True, exist_ok=True)
        
        src = Path(file_path)
        dest = images_dir / src.name
        counter = 1
        while dest.exists():
            dest = images_dir / f"{src.stem}_{counter}{src.suffix}"
            counter += 1
        shutil.copy2(src, dest)
        
        alt = simpledialog.askstring("Alt Text", "Alt text:", parent=self.frame) or dest.stem
        self.content_text.insert(tk.INSERT, f"\n![{alt}](images/{dest.name})\n")
        self.mark_modified()
        
    def insert_code_block(self):
        lang = simpledialog.askstring("Language", "Language (optional):", parent=self.frame) or ""
        try:
            selected = self.content_text.get(tk.SEL_FIRST, tk.SEL_LAST)
            self.content_text.delete(tk.SEL_FIRST, tk.SEL_LAST)
            self.content_text.insert(tk.INSERT, f"\n```{lang}\n{selected}\n```\n")
        except tk.TclError:
            self.content_text.insert(tk.INSERT, f"\n```{lang}\n\n```\n")
        self.mark_modified()


class ProjectsTab:
    def __init__(self, parent):
        self.frame = ttk.Frame(parent)
        self.projects = []
        self.current_index = None
        self.is_modified = False
        
        self.create_layout()
        self.load_projects()
        
    def create_layout(self):
        main_frame = ttk.Frame(self.frame)
        main_frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
        
        # Left panel
        left_panel = ttk.Frame(main_frame, width=280)
        left_panel.pack(side=tk.LEFT, fill=tk.Y, padx=(0, 10))
        left_panel.pack_propagate(False)
        
        ttk.Label(left_panel, text="Projects", style="Header.TLabel").pack(anchor=tk.W, pady=(0, 10))
        
        self.projects_listbox = tk.Listbox(
            left_panel, bg=COLORS["bg_medium"], fg=COLORS["fg_light"],
            selectbackground=COLORS["accent_pink"], selectforeground="#000000",
            font=("Segoe UI", 10), borderwidth=0, highlightthickness=1,
            highlightcolor=COLORS["accent_pink"]
        )
        self.projects_listbox.pack(fill=tk.BOTH, expand=True)
        self.projects_listbox.bind("<<ListboxSelect>>", self.on_project_select)
        
        btn_frame = ttk.Frame(left_panel)
        btn_frame.pack(fill=tk.X, pady=(10, 0))
        ttk.Button(btn_frame, text="+ New", command=self.new_project).pack(side=tk.LEFT, expand=True, fill=tk.X, padx=(0, 2))
        ttk.Button(btn_frame, text="🗑 Delete", command=self.delete_project).pack(side=tk.LEFT, expand=True, fill=tk.X, padx=(2, 0))
        
        move_frame = ttk.Frame(left_panel)
        move_frame.pack(fill=tk.X, pady=(5, 0))
        ttk.Button(move_frame, text="↑", command=self.move_up).pack(side=tk.LEFT, expand=True, fill=tk.X, padx=(0, 2))
        ttk.Button(move_frame, text="↓", command=self.move_down).pack(side=tk.LEFT, expand=True, fill=tk.X, padx=(2, 0))
        
        # Right panel
        right_panel = ttk.Frame(main_frame)
        right_panel.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        
        form_frame = ttk.Frame(right_panel)
        form_frame.pack(fill=tk.X, pady=(0, 10))
        form_frame.columnconfigure(1, weight=1)
        
        row = 0
        ttk.Label(form_frame, text="Title:").grid(row=row, column=0, sticky=tk.W, pady=5)
        self.title_var = tk.StringVar()
        tk.Entry(form_frame, textvariable=self.title_var, bg=COLORS["bg_medium"], fg=COLORS["fg_white"],
                 insertbackground=COLORS["fg_white"], font=("Segoe UI", 12), borderwidth=0).grid(row=row, column=1, sticky=tk.EW, pady=5, padx=(10, 0))
        row += 1
        
        ttk.Label(form_frame, text="Status:").grid(row=row, column=0, sticky=tk.W, pady=5)
        self.status_var = tk.StringVar(value="planned")
        status_frame = ttk.Frame(form_frame)
        status_frame.grid(row=row, column=1, sticky=tk.W, pady=5, padx=(10, 0))
        for status in ["completed", "in-progress", "planned"]:
            tk.Radiobutton(status_frame, text=status.replace("-", " ").title(), variable=self.status_var,
                          value=status, bg=COLORS["bg_dark"], fg=COLORS["fg_light"], selectcolor=COLORS["bg_light"]).pack(side=tk.LEFT, padx=(0, 10))
        row += 1
        
        ttk.Label(form_frame, text="Tags:").grid(row=row, column=0, sticky=tk.W, pady=5)
        self.tags_var = tk.StringVar()
        tk.Entry(form_frame, textvariable=self.tags_var, bg=COLORS["bg_medium"], fg=COLORS["fg_white"],
                 insertbackground=COLORS["fg_white"], font=("Segoe UI", 10), borderwidth=0).grid(row=row, column=1, sticky=tk.EW, pady=5, padx=(10, 0))
        row += 1
        
        ttk.Label(form_frame, text="GitHub:").grid(row=row, column=0, sticky=tk.W, pady=5)
        self.github_var = tk.StringVar()
        tk.Entry(form_frame, textvariable=self.github_var, bg=COLORS["bg_medium"], fg=COLORS["fg_white"],
                 insertbackground=COLORS["fg_white"], font=("Segoe UI", 10), borderwidth=0).grid(row=row, column=1, sticky=tk.EW, pady=5, padx=(10, 0))
        row += 1
        
        ttk.Label(form_frame, text="Live URL:").grid(row=row, column=0, sticky=tk.W, pady=5)
        self.live_var = tk.StringVar()
        tk.Entry(form_frame, textvariable=self.live_var, bg=COLORS["bg_medium"], fg=COLORS["fg_white"],
                 insertbackground=COLORS["fg_white"], font=("Segoe UI", 10), borderwidth=0).grid(row=row, column=1, sticky=tk.EW, pady=5, padx=(10, 0))
        row += 1
        
        self.featured_var = tk.BooleanVar()
        tk.Checkbutton(form_frame, text="Featured", variable=self.featured_var, bg=COLORS["bg_dark"],
                       fg=COLORS["fg_light"], selectcolor=COLORS["bg_light"]).grid(row=row, column=1, sticky=tk.W, pady=5, padx=(10, 0))
        
        # Description
        ttk.Label(right_panel, text="Description:", style="Header.TLabel").pack(anchor=tk.W, pady=(10, 5))
        self.description_text = scrolledtext.ScrolledText(right_panel, bg=COLORS["bg_medium"], fg=COLORS["fg_white"],
                                                           insertbackground=COLORS["fg_white"], font=("Segoe UI", 11),
                                                           wrap=tk.WORD, borderwidth=0, height=15)
        self.description_text.pack(fill=tk.BOTH, expand=True)
        
        # Save button
        save_frame = ttk.Frame(right_panel)
        save_frame.pack(fill=tk.X, pady=(10, 0))
        tk.Button(save_frame, text="💾 Save All (Ctrl+S)", command=self.save_all, bg=COLORS["accent_pink"],
                  fg="#000000", font=("Segoe UI", 11, "bold"), borderwidth=0, padx=15, pady=5).pack(side=tk.RIGHT)
        
    def load_projects(self):
        try:
            if PROJECTS_FILE.exists():
                with open(PROJECTS_FILE, "r", encoding="utf-8-sig") as f:
                    content = f.read().strip()
                    if content:
                        data = json.loads(content)
                        # Handle both {"projects": [...]} and [...] formats
                        self.projects = data.get("projects", data) if isinstance(data, dict) else data
                    else:
                        self.projects = []
            else:
                self.projects = []
        except Exception:
            self.projects = []
        self.refresh_list()
        
    def refresh_list(self):
        self.projects_listbox.delete(0, tk.END)
        for proj in self.projects:
            icon = {"completed": "✓", "in-progress": "⟳", "planned": "○"}.get(proj.get("status", ""), "")
            self.projects_listbox.insert(tk.END, f"{icon} {proj.get('title', 'Untitled')}")
            
    def on_project_select(self, event):
        selection = self.projects_listbox.curselection()
        if not selection:
            return
        if self.is_modified and self.current_index is not None:
            self.save_current_to_memory()
        self.current_index = selection[0]
        self.load_project_to_form(self.projects[self.current_index])
        self.is_modified = False
        
    def load_project_to_form(self, project):
        self.title_var.set(project.get("title", ""))
        self.status_var.set(project.get("status", "planned"))
        self.tags_var.set(", ".join(project.get("tags", [])))
        self.github_var.set(project.get("github", ""))
        self.live_var.set(project.get("live", ""))
        self.featured_var.set(project.get("featured", False))
        self.description_text.delete("1.0", tk.END)
        self.description_text.insert("1.0", project.get("description", ""))
        
    def save_current_to_memory(self):
        if self.current_index is None:
            return
        tags = [t.strip() for t in self.tags_var.get().split(",") if t.strip()]
        proj = {
            "title": self.title_var.get(),
            "description": self.description_text.get("1.0", tk.END).strip(),
            "status": self.status_var.get(),
            "tags": tags,
        }
        if self.github_var.get():
            proj["github"] = self.github_var.get()
        if self.live_var.get():
            proj["live"] = self.live_var.get()
        if self.featured_var.get():
            proj["featured"] = True
        self.projects[self.current_index] = proj
        
    def save_all(self):
        if self.current_index is not None:
            self.save_current_to_memory()
        try:
            PROJECTS_FILE.parent.mkdir(parents=True, exist_ok=True)
            with open(PROJECTS_FILE, "w", encoding="utf-8") as f:
                json.dump({"projects": self.projects}, f, indent=4, ensure_ascii=False)
            self.is_modified = False
            self.refresh_list()
            if self.current_index is not None:
                self.projects_listbox.selection_set(self.current_index)
            messagebox.showinfo("Saved", f"Saved {len(self.projects)} projects!")
        except Exception as e:
            messagebox.showerror("Error", f"Failed to save: {e}")
            
    def new_project(self):
        if self.is_modified and self.current_index is not None:
            self.save_current_to_memory()
        new_proj = {"title": "New Project", "description": "", "status": "planned", "tags": []}
        self.projects.append(new_proj)
        self.refresh_list()
        self.current_index = len(self.projects) - 1
        self.projects_listbox.selection_clear(0, tk.END)
        self.projects_listbox.selection_set(self.current_index)
        self.load_project_to_form(new_proj)
        self.is_modified = True
        
    def delete_project(self):
        if self.current_index is None:
            return
        if not messagebox.askyesno("Delete", f"Delete '{self.projects[self.current_index].get('title')}'?"):
            return
        del self.projects[self.current_index]
        self.current_index = None
        self.refresh_list()
        self.clear_form()
        self.is_modified = True
        
    def clear_form(self):
        self.title_var.set("")
        self.status_var.set("planned")
        self.tags_var.set("")
        self.github_var.set("")
        self.live_var.set("")
        self.featured_var.set(False)
        self.description_text.delete("1.0", tk.END)
        
    def move_up(self):
        if self.current_index is None or self.current_index == 0:
            return
        self.save_current_to_memory()
        i = self.current_index
        self.projects[i], self.projects[i-1] = self.projects[i-1], self.projects[i]
        self.current_index = i - 1
        self.refresh_list()
        self.projects_listbox.selection_set(self.current_index)
        self.is_modified = True
        
    def move_down(self):
        if self.current_index is None or self.current_index >= len(self.projects) - 1:
            return
        self.save_current_to_memory()
        i = self.current_index
        self.projects[i], self.projects[i+1] = self.projects[i+1], self.projects[i]
        self.current_index = i + 1
        self.refresh_list()
        self.projects_listbox.selection_set(self.current_index)
        self.is_modified = True


class AboutTab:
    def __init__(self, parent):
        self.frame = ttk.Frame(parent)
        self.skill_categories = []
        self.current_cat_index = None
        
        self.create_layout()
        self.load_about()
        
    def create_layout(self):
        # Sub-notebook for Description / Skills
        self.sub_notebook = ttk.Notebook(self.frame)
        self.sub_notebook.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
        
        # Description tab
        desc_frame = ttk.Frame(self.sub_notebook)
        self.sub_notebook.add(desc_frame, text="  Description  ")
        self.create_description_tab(desc_frame)
        
        # Skills tab
        skills_frame = ttk.Frame(self.sub_notebook)
        self.sub_notebook.add(skills_frame, text="  Skills  ")
        self.create_skills_tab(skills_frame)
        
        # Save button
        save_frame = ttk.Frame(self.frame)
        save_frame.pack(fill=tk.X, padx=10, pady=(0, 10))
        tk.Button(save_frame, text="💾 Save About (Ctrl+S)", command=self.save_about, bg=COLORS["accent_purple"],
                  fg="#000000", font=("Segoe UI", 11, "bold"), borderwidth=0, padx=15, pady=5).pack(side=tk.RIGHT)
        
    def create_description_tab(self, parent):
        main_frame = ttk.Frame(parent)
        main_frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
        
        # About text area
        ttk.Label(main_frame, text="About Me", style="Header.TLabel").pack(anchor=tk.W, pady=(0, 5))
        ttk.Label(main_frame, text="Separate paragraphs with blank lines").pack(anchor=tk.W, pady=(0, 10))
        
        self.about_text = scrolledtext.ScrolledText(main_frame, bg=COLORS["bg_medium"], fg=COLORS["fg_white"],
                                                     insertbackground=COLORS["fg_white"], font=("Segoe UI", 11),
                                                     wrap=tk.WORD, borderwidth=0, height=15)
        self.about_text.pack(fill=tk.BOTH, expand=True)
        
        # Profile image settings
        ttk.Label(main_frame, text="Profile Image", style="Header.TLabel").pack(anchor=tk.W, pady=(20, 5))
        img_frame = ttk.Frame(main_frame)
        img_frame.pack(fill=tk.X)
        img_frame.columnconfigure(1, weight=1)
        
        ttk.Label(img_frame, text="Image URL:").grid(row=0, column=0, sticky=tk.W, pady=2)
        self.img_url_var = tk.StringVar()
        tk.Entry(img_frame, textvariable=self.img_url_var, bg=COLORS["bg_medium"], fg=COLORS["fg_white"],
                 insertbackground=COLORS["fg_white"], font=("Segoe UI", 10), borderwidth=0).grid(row=0, column=1, sticky=tk.EW, padx=(10, 0), pady=2)
        
        ttk.Label(img_frame, text="Link URL:").grid(row=1, column=0, sticky=tk.W, pady=2)
        self.img_link_var = tk.StringVar()
        tk.Entry(img_frame, textvariable=self.img_link_var, bg=COLORS["bg_medium"], fg=COLORS["fg_white"],
                 insertbackground=COLORS["fg_white"], font=("Segoe UI", 10), borderwidth=0).grid(row=1, column=1, sticky=tk.EW, padx=(10, 0), pady=2)
        
    def create_skills_tab(self, parent):
        main_frame = ttk.Frame(parent)
        main_frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
        
        # Left - categories list
        left_panel = ttk.Frame(main_frame, width=250)
        left_panel.pack(side=tk.LEFT, fill=tk.Y, padx=(0, 10))
        left_panel.pack_propagate(False)
        
        ttk.Label(left_panel, text="Categories", style="Header.TLabel").pack(anchor=tk.W, pady=(0, 10))
        
        self.cat_listbox = tk.Listbox(left_panel, bg=COLORS["bg_medium"], fg=COLORS["fg_light"],
                                       selectbackground=COLORS["accent_purple"], selectforeground="#000000",
                                       font=("Segoe UI", 10), borderwidth=0)
        self.cat_listbox.pack(fill=tk.BOTH, expand=True)
        self.cat_listbox.bind("<<ListboxSelect>>", self.on_category_select)
        
        btn_frame = ttk.Frame(left_panel)
        btn_frame.pack(fill=tk.X, pady=(10, 0))
        ttk.Button(btn_frame, text="+ New", command=self.new_category).pack(side=tk.LEFT, expand=True, fill=tk.X, padx=(0, 2))
        ttk.Button(btn_frame, text="🗑 Delete", command=self.delete_category).pack(side=tk.LEFT, expand=True, fill=tk.X, padx=(2, 0))
        
        move_frame = ttk.Frame(left_panel)
        move_frame.pack(fill=tk.X, pady=(5, 0))
        ttk.Button(move_frame, text="↑", command=self.move_cat_up).pack(side=tk.LEFT, expand=True, fill=tk.X, padx=(0, 2))
        ttk.Button(move_frame, text="↓", command=self.move_cat_down).pack(side=tk.LEFT, expand=True, fill=tk.X, padx=(2, 0))
        
        # Right - category editor
        right_panel = ttk.Frame(main_frame)
        right_panel.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        
        ttk.Label(right_panel, text="Category Name:").pack(anchor=tk.W, pady=(0, 5))
        self.cat_name_var = tk.StringVar()
        self.cat_name_entry = tk.Entry(right_panel, textvariable=self.cat_name_var, bg=COLORS["bg_medium"],
                                        fg=COLORS["fg_white"], insertbackground=COLORS["fg_white"],
                                        font=("Segoe UI", 14), borderwidth=0)
        self.cat_name_entry.pack(fill=tk.X, pady=(0, 15))
        self.cat_name_var.trace_add("write", lambda *args: self.update_category_name())
        
        ttk.Label(right_panel, text="Skills (one per line):").pack(anchor=tk.W, pady=(0, 5))
        self.skills_text = scrolledtext.ScrolledText(right_panel, bg=COLORS["bg_medium"], fg=COLORS["fg_white"],
                                                      insertbackground=COLORS["fg_white"], font=("Segoe UI", 11),
                                                      wrap=tk.WORD, borderwidth=0, height=20)
        self.skills_text.pack(fill=tk.BOTH, expand=True)
        self.skills_text.bind("<KeyRelease>", lambda e: self.update_category_skills())
        
    def refresh_categories_list(self):
        self.cat_listbox.delete(0, tk.END)
        for cat in self.skill_categories:
            count = len(cat.get("skills", []))
            self.cat_listbox.insert(tk.END, f"{cat['name']} ({count})")
            
    def on_category_select(self, event):
        selection = self.cat_listbox.curselection()
        if not selection:
            return
        self.current_cat_index = selection[0]
        cat = self.skill_categories[self.current_cat_index]
        self.cat_name_var.set(cat["name"])
        self.skills_text.delete("1.0", tk.END)
        self.skills_text.insert("1.0", "\n".join(cat.get("skills", [])))
        
    def update_category_name(self):
        if self.current_cat_index is not None and self.current_cat_index < len(self.skill_categories):
            self.skill_categories[self.current_cat_index]["name"] = self.cat_name_var.get()
            self.refresh_categories_list()
            self.cat_listbox.selection_set(self.current_cat_index)
            
    def update_category_skills(self):
        if self.current_cat_index is not None and self.current_cat_index < len(self.skill_categories):
            text = self.skills_text.get("1.0", tk.END).strip()
            skills = [s.strip() for s in text.split("\n") if s.strip()]
            self.skill_categories[self.current_cat_index]["skills"] = skills
            self.refresh_categories_list()
            self.cat_listbox.selection_set(self.current_cat_index)
            
    def new_category(self):
        new_cat = {"name": "New Category", "skills": []}
        self.skill_categories.append(new_cat)
        self.refresh_categories_list()
        self.current_cat_index = len(self.skill_categories) - 1
        self.cat_listbox.selection_clear(0, tk.END)
        self.cat_listbox.selection_set(self.current_cat_index)
        self.on_category_select(None)
        
    def delete_category(self):
        if self.current_cat_index is None:
            return
        if not messagebox.askyesno("Delete", f"Delete '{self.skill_categories[self.current_cat_index]['name']}'?"):
            return
        del self.skill_categories[self.current_cat_index]
        self.current_cat_index = None
        self.refresh_categories_list()
        self.cat_name_var.set("")
        self.skills_text.delete("1.0", tk.END)
        
    def move_cat_up(self):
        if self.current_cat_index is None or self.current_cat_index == 0:
            return
        i = self.current_cat_index
        self.skill_categories[i], self.skill_categories[i-1] = self.skill_categories[i-1], self.skill_categories[i]
        self.current_cat_index = i - 1
        self.refresh_categories_list()
        self.cat_listbox.selection_set(self.current_cat_index)
        
    def move_cat_down(self):
        if self.current_cat_index is None or self.current_cat_index >= len(self.skill_categories) - 1:
            return
        i = self.current_cat_index
        self.skill_categories[i], self.skill_categories[i+1] = self.skill_categories[i+1], self.skill_categories[i]
        self.current_cat_index = i + 1
        self.refresh_categories_list()
        self.cat_listbox.selection_set(self.current_cat_index)
        
    def load_about(self):
        try:
            with open(ABOUT_FILE, "r", encoding="utf-8") as f:
                html = f.read()
            
            # Parse paragraphs and join with double newlines
            para_match = re.search(r'<div class="paragraph">(.*?)</div>', html, re.DOTALL)
            if para_match:
                paras = re.findall(r'<p>(.*?)</p>', para_match.group(1), re.DOTALL)
                self.about_text.insert("1.0", "\n\n".join(p.strip() for p in paras))
            
            # Parse profile image
            img_match = re.search(r'<a href="([^"]*)"[^>]*><img class="pfp" src="([^"]*)"', html)
            if img_match:
                self.img_link_var.set(img_match.group(1))
                self.img_url_var.set(img_match.group(2))
            
            # Parse skill categories
            cat_pattern = r'<div class="skill-category">\s*<h3>([^<]+)</h3>\s*<div class="skill-tags">(.*?)</div>\s*</div>'
            for match in re.finditer(cat_pattern, html, re.DOTALL):
                cat_name = match.group(1).strip()
                skills = re.findall(r'<span class="skill-tag">([^<]+)</span>', match.group(2))
                self.skill_categories.append({"name": cat_name, "skills": skills})
            
            self.refresh_categories_list()
        except Exception as e:
            messagebox.showerror("Error", f"Failed to load about.html: {e}")
            
    def save_about(self):
        try:
            # Get text and split by double newlines into paragraphs
            text = self.about_text.get("1.0", tk.END).strip()
            paragraphs = [p.strip() for p in re.split(r'\n\s*\n', text) if p.strip()]
            
            para_html = "\n".join(f"            <p>{p}</p>" for p in paragraphs)
            
            skills_html = ""
            for cat in self.skill_categories:
                skills_tags = "\n".join(f'                <span class="skill-tag">{s}</span>' for s in cat["skills"])
                skills_html += f'''
        <div class="skill-category">
            <h3>{cat["name"]}</h3>
            <div class="skill-tags">
{skills_tags}
            </div>
        </div>
'''
            
            html = f'''<section id="about">
    <p class="subtitle">About Me</p>
    <div class="content">
        <div class="paragraph">
{para_html}
        </div>
        <div>
            <a href="{self.img_link_var.get()}" target="_blank"><img class="pfp" src="{self.img_url_var.get()}" alt="Profile picture"></a>
        </div>
    </div>

    <div class="skills-section">
        <p class="subsubtitle">Skills & Technologies</p>
{skills_html}    </div>
</section>
'''
            
            with open(ABOUT_FILE, "w", encoding="utf-8") as f:
                f.write(html)
            
            messagebox.showinfo("Saved", "About page saved!")
        except Exception as e:
            messagebox.showerror("Error", f"Failed to save: {e}")


def main():
    # Ensure directories exist
    POSTS_PATH.mkdir(parents=True, exist_ok=True)
    if not INDEX_FILE.exists():
        with open(INDEX_FILE, "w", encoding="utf-8") as f:
            json.dump({"posts": []}, f, indent=4)
    
    root = tk.Tk()
    
    # Check for PIL
    if not HAS_PIL:
        messagebox.showwarning("Missing Package", 
            "Install 'Pillow' for clipboard image paste support:\npip install Pillow")
    
    app = SiteEditor(root)
    root.mainloop()


if __name__ == "__main__":
    main()
