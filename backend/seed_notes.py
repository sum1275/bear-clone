import sqlite3
from datetime import datetime, timezone
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "data", "notes.db")

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

# Sample note templates
titles = [
    "Python basics", "FastAPI tutorial", "React hooks explained",
    "Database design", "API best practices", "Frontend performance",
    "Testing strategies", "DevOps guide", "Authentication systems",
    "Caching patterns", "Message queues", "Microservices",
    "Docker containers", "Kubernetes deployment", "CI/CD pipelines",
    "Web security", "SQL optimization", "REST vs GraphQL",
    "TypeScript advanced", "React patterns", "State management",
    "Next.js SSR", "Frontend testing", "Accessibility guide",
    "SEO optimization", "Cloud architecture", "Monitoring systems",
    "Logging best practices", "Error handling", "Code review guide",
    "Git workflows", "Agile methodology", "Scrum framework",
    "Team communication", "Documentation writing", "Technical writing",
    "Project management", "Time management", "Learning strategies",
    "Problem solving", "Algorithm design", "Data structures",
    "Network protocols", "HTTP/2 vs HTTP/3", "WebSockets guide",
    "Real-time systems", "Streaming data", "Big data processing"
]

contents = [
    "This is a comprehensive guide about the topic.",
    "Learn the fundamentals and best practices.",
    "Advanced techniques and optimization tips.",
    "Real-world examples and case studies.",
    "Common pitfalls and how to avoid them.",
]

now = datetime.now(timezone.utc).isoformat()

# Insert 50 notes
for i in range(50):
    title = titles[i % len(titles)]
    content = contents[i % len(contents)]
    cursor.execute(
        "INSERT INTO notes (title, content, created_at, updated_at) VALUES (?, ?, ?, ?)",
        (f"{title} - Part {i+1}", f"{content}\n\nNote #{i+1}", now, now)
    )

conn.commit()
conn.close()

print("✅ Added 50 sample notes!")
