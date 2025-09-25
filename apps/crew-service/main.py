import os
import json
import sqlite3
from pathlib import Path
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Any, Dict, List, Optional
from dotenv import load_dotenv
from urllib import request as urlrequest
from urllib.error import HTTPError
import ssl
import certifi
import math

load_dotenv()

# -----------------------------
# Instruction Registry (centralized)
# -----------------------------
ROLE_INSTRUCTIONS = {
    "Facilitator": "You help founders capture their problem succinctly.",
    "Market Analyst": "You highlight market impact and user personas.",
    "Critical Cassandra": "You respectfully challenge assumptions and highlight risks.",
    "Smart Planner": "You synthesize differing viewpoints into a pragmatic consensus.",
    "Product Manager": "You ask clarifying questions to reduce ambiguity and define scope.",
    "CEO": "You help narrow scope and set boundaries with pragmatic tradeoffs.",
    "CTO": "You outline simple, reliable MVP approaches and technical feasibility.",
    "Growth Hacker": "You bring GTM perspective with actionable steps and signals.",
    "Research Lead": "You find competitors and alternatives with evidence.",
    "Data Analyst": "You quantify competitive landscape with metrics and sources.",
    "Strategy Lead": "You identify sustainable competitive advantages.",
    "DevOps": "You plan lean, reliable delivery and sequencing.",
    "Summarizer": "You summarize discussions concisely retaining key decisions and risks."
}

def instruction_for(role: str) -> str:
    return ROLE_INSTRUCTIONS.get(role, "You are a pragmatic expert. Keep outputs concise and actionable.")

def embed_text_via_llm(text: str) -> List[float]:
    # Minimal, model-agnostic stub: call OpenAI embeddings if key present; otherwise use a trivial hash-based vector
    api_key = os.getenv("OPENAI_API_KEY")
    try:
        if api_key and len(api_key) > 20:
            payload = json.dumps({
                "input": text,
                "model": os.getenv("OPENAI_EMBED_MODEL", "text-embedding-3-small")
            }).encode("utf-8")
            req = urlrequest.Request(
                url="https://api.openai.com/v1/embeddings",
                data=payload,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {api_key}"
                },
                method="POST"
            )
            ssl_ctx = ssl.create_default_context(cafile=certifi.where())
            with urlrequest.urlopen(req, timeout=30, context=ssl_ctx) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                vec = data.get("data", [{}])[0].get("embedding", [])
                if isinstance(vec, list) and vec:
                    return vec
        # Fallback deterministic tiny vector
        h = abs(hash(text))
        # Create a small pseudo-vector
        return [((h >> i) & 0xFF) / 255.0 for i in range(0, 128, 8)]
    except Exception:
        # Non-fatal; return pseudo-vector
        h = abs(hash(text))
        return [((h >> i) & 0xFF) / 255.0 for i in range(0, 128, 8)]


# -----------------------------
# Durable Memory Store (SQLite)
# -----------------------------
class MemoryStore:
    def __init__(self, db_path: str):
        self.db_path = db_path
        Path(db_path).parent.mkdir(parents=True, exist_ok=True)
        self.conn = sqlite3.connect(db_path, check_same_thread=False)
        self.conn.execute("PRAGMA journal_mode=WAL;")
        self._init_schema()
        
        # Activity event configuration
        self.activity_webhook_url = os.getenv("ACTIVITY_WEBHOOK_URL", None)
        self.activity_enabled = os.getenv("ACTIVITY_TRACKING_ENABLED", "true").lower() == "true"

    def _init_schema(self):
        cur = self.conn.cursor()
        cur.execute("""
        CREATE TABLE IF NOT EXISTS sessions (
            session_id TEXT PRIMARY KEY,
            created_at TEXT,
            current_stage TEXT,
            turn INTEGER
        );
        """)
        cur.execute("""
        CREATE TABLE IF NOT EXISTS messages (
            id TEXT PRIMARY KEY,
            session_id TEXT,
            idx INTEGER,
            payload TEXT
        );
        """)
        cur.execute("""
        CREATE TABLE IF NOT EXISTS decisions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT,
            stage TEXT,
            decision TEXT,
            user_message TEXT,
            timestamp TEXT
        );
        """)
        cur.execute("""
        CREATE TABLE IF NOT EXISTS notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT,
            stage TEXT,
            content TEXT,
            timestamp TEXT
        );
        """)
        cur.execute("""
        CREATE TABLE IF NOT EXISTS summaries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT,
            stage TEXT,
            content TEXT,
            timestamp TEXT
        );
        """)
        cur.execute("""
        CREATE TABLE IF NOT EXISTS embeddings (
            id TEXT PRIMARY KEY,
            namespace TEXT,
            session_id TEXT,
            text TEXT,
            vector TEXT
        );
        """)
        cur.execute("""
        CREATE TABLE IF NOT EXISTS tools (
            id TEXT PRIMARY KEY,
            name TEXT,
            description TEXT,
            schema TEXT
        );
        """)
        cur.execute("""
        CREATE TABLE IF NOT EXISTS tool_calls (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tool_id TEXT,
            session_id TEXT,
            params TEXT,
            result TEXT,
            status TEXT,
            timestamp TEXT
        );
        """)
        self.conn.commit()

    def save_session(self, session_id: str, stage: str, turn: int):
        cur = self.conn.cursor()
        now = __import__("datetime").datetime.utcnow().isoformat()
        cur.execute(
            "INSERT INTO sessions(session_id, created_at, current_stage, turn) VALUES(?,?,?,?) ON CONFLICT(session_id) DO UPDATE SET current_stage=excluded.current_stage, turn=excluded.turn",
            (session_id, now, stage, turn)
        )
        self.conn.commit()

    def save_message(self, session_id: str, msg_id: str, idx: int, payload: dict):
        cur = self.conn.cursor()
        cur.execute(
            "INSERT OR REPLACE INTO messages(id, session_id, idx, payload) VALUES(?,?,?,?)",
            (msg_id, session_id, idx, json.dumps(payload))
        )
        self.conn.commit()

    def save_decision(self, session_id: str, stage: str, decision: str, user_message: str, timestamp: str):
        cur = self.conn.cursor()
        cur.execute(
            "INSERT INTO decisions(session_id, stage, decision, user_message, timestamp) VALUES(?,?,?,?,?)",
            (session_id, stage, decision, user_message or "", timestamp)
        )
        self.conn.commit()

    def add_note(self, session_id: str, stage: str, content: str):
        cur = self.conn.cursor()
        now = __import__("datetime").datetime.utcnow().isoformat()
        cur.execute(
            "INSERT INTO notes(session_id, stage, content, timestamp) VALUES(?,?,?,?)",
            (session_id, stage, content, now)
        )
        self.conn.commit()
        
        # Emit activity event for document reading
        self._emit_activity_event(session_id, 'document_read', f'Added research note in {stage}', {
            'title': f'Research Note - {stage}',
            'type': 'note',
            'content': content[:200] + ('...' if len(content) > 200 else ''),
            'stage': stage,
            'timestamp': now
        })

    def list_notes(self, session_id: str) -> list:
        cur = self.conn.cursor()
        cur.execute("SELECT stage, content, timestamp FROM notes WHERE session_id=? ORDER BY id ASC", (session_id,))
        return [
            {"stage": r[0], "content": r[1], "timestamp": r[2]}
            for r in cur.fetchall()
        ]

    def save_summary(self, session_id: str, stage: str, content: str):
        cur = self.conn.cursor()
        now = __import__("datetime").datetime.utcnow().isoformat()
        cur.execute(
            "INSERT INTO summaries(session_id, stage, content, timestamp) VALUES(?,?,?,?)",
            (session_id, stage, content, now)
        )
        self.conn.commit()
        
        # Emit activity event for content creation
        self._emit_activity_event(session_id, 'content_created', f'Generated summary for {stage}', {
            'title': f'Summary - {stage}',
            'type': 'summary',
            'content': content[:200] + ('...' if len(content) > 200 else ''),
            'stage': stage,
            'timestamp': now
        })

    def get_latest_summary(self, session_id: str, stage: str) -> str:
        cur = self.conn.cursor()
        cur.execute(
            "SELECT content FROM summaries WHERE session_id=? AND stage=? ORDER BY id DESC LIMIT 1",
            (session_id, stage)
        )
        row = cur.fetchone()
        return row[0] if row else ""

    def get_bundle(self, session_id: str) -> dict:
        cur = self.conn.cursor()
        cur.execute("SELECT current_stage, turn FROM sessions WHERE session_id=?", (session_id,))
        row = cur.fetchone()
        cur.execute("SELECT payload FROM messages WHERE session_id=? ORDER BY idx ASC", (session_id,))
        msgs = [json.loads(r[0]) for r in cur.fetchall()]
        cur.execute("SELECT stage, decision, user_message, timestamp FROM decisions WHERE session_id=? ORDER BY id ASC", (session_id,))
        decisions = [
            {"stage": r[0], "decision": r[1], "userMessage": r[2], "timestamp": r[3]}
            for r in cur.fetchall()
        ]
        cur.execute("SELECT stage, content, timestamp FROM summaries WHERE session_id=? ORDER BY id ASC", (session_id,))
        summaries = [
            {"stage": r[0], "content": r[1], "timestamp": r[2]}
            for r in cur.fetchall()
        ]
        return {
            "sessionId": session_id,
            "currentStage": row[0] if row else None,
            "turn": row[1] if row else 0,
            "messages": msgs,
            "decisions": decisions,
            "notes": self.list_notes(session_id),
            "summaries": summaries,
        }

    # Embedding store methods
    def upsert_embedding(self, emb_id: str, namespace: str, text: str, vector: list, session_id: Optional[str] = None):
        cur = self.conn.cursor()
        cur.execute(
            "INSERT OR REPLACE INTO embeddings(id, namespace, session_id, text, vector) VALUES(?,?,?,?,?)",
            (emb_id, namespace, session_id or "", text, json.dumps(vector))
        )
        self.conn.commit()

    def list_embeddings(self, namespace: str) -> list:
        cur = self.conn.cursor()
        cur.execute("SELECT id, text, vector, session_id FROM embeddings WHERE namespace=?", (namespace,))
        out = []
        for r in cur.fetchall():
            out.append({"id": r[0], "text": r[1], "vector": json.loads(r[2]), "sessionId": r[3]})
        return out

    def search_embeddings(self, namespace: str, query_vector: list, top_k: int = 5) -> list:
        items = self.list_embeddings(namespace)
        def norm(v):
            return math.sqrt(sum((x*x) for x in v)) or 1.0
        qn = norm(query_vector)
        scored = []
        for it in items:
            vec = it.get("vector") or []
            if not vec:
                continue
            dn = norm(vec)
            dot = sum((a*b) for a,b in zip(query_vector, vec))
            score = dot / (qn*dn)
            scored.append((score, it))
        scored.sort(key=lambda x: x[0], reverse=True)
        return [{"score": s, **it} for s,it in scored[:top_k]]

    # Tools registry and tracing
    def register_tool(self, tool_id: str, name: str, description: str, schema: dict):
        cur = self.conn.cursor()
        cur.execute(
            "INSERT OR REPLACE INTO tools(id, name, description, schema) VALUES(?,?,?,?)",
            (tool_id, name, description, json.dumps(schema))
        )
        self.conn.commit()

    def trace_tool_call(self, tool_id: str, session_id: str, params: dict, result: dict, status: str):
        cur = self.conn.cursor()
        now = __import__("datetime").datetime.utcnow().isoformat()
        cur.execute(
            "INSERT INTO tool_calls(tool_id, session_id, params, result, status, timestamp) VALUES(?,?,?,?,?,?)",
            (tool_id, session_id, json.dumps(params), json.dumps(result), status, now)
        )
        self.conn.commit()
        
        # Emit activity event for tool usage
        self._emit_activity_event(session_id, 'tool_used', f'Used {tool_id} tool', {
            'toolName': tool_id,
            'success': status == 'success',
            'timestamp': now,
            'params': params,
            'result': result
        })

    def list_tools(self) -> list:
        cur = self.conn.cursor()
        cur.execute("SELECT id, name, description, schema FROM tools ORDER BY id ASC")
        return [
            {"id": r[0], "name": r[1], "description": r[2], "schema": json.loads(r[3]) if r[3] else {}}
            for r in cur.fetchall()
        ]
        
    def _emit_activity_event(self, session_id: str, activity_type: str, description: str, metadata: dict):
        """Emit activity event via webhook to main API server"""
        if not self.activity_enabled:
            return
            
        try:
            # Default to main API server if no webhook URL specified
            webhook_url = self.activity_webhook_url or f"{os.getenv('API_BASE_URL', 'http://localhost:3456')}/api/activity/track"
            
            payload = json.dumps({
                "sessionId": session_id,
                "activityType": activity_type,
                "description": description,
                "metadata": metadata
            }).encode("utf-8")
            
            req = urlrequest.Request(
                url=webhook_url,
                data=payload,
                headers={
                    "Content-Type": "application/json",
                    "X-Source": "crew-service"
                },
                method="POST"
            )
            
            # Non-blocking call with short timeout
            try:
                ssl_ctx = ssl.create_default_context(cafile=certifi.where())
                with urlrequest.urlopen(req, timeout=2, context=ssl_ctx) as resp:
                    if resp.status == 200:
                        print(f"[Activity] Emitted {activity_type} event for session {session_id}")
                    else:
                        print(f"[Activity] Warning: Failed to emit event, status {resp.status}")
            except Exception as e:
                # Non-fatal, log but continue
                print(f"[Activity] Warning: Failed to emit activity event: {e}")
                
        except Exception as e:
            # Non-fatal, log but continue
            print(f"[Activity] Error: Failed to prepare activity event: {e}")

    def list_tool_calls(self, session_id: str) -> list:
        cur = self.conn.cursor()
        cur.execute("SELECT tool_id, params, result, status, timestamp FROM tool_calls WHERE session_id=? ORDER BY id ASC", (session_id,))
        return [
            {
                "toolId": r[0],
                "params": json.loads(r[1]) if r[1] else {},
                "result": json.loads(r[2]) if r[2] else {},
                "status": r[3],
                "timestamp": r[4]
            }
            for r in cur.fetchall()
        ]


# Create global memory store
MEMORY = MemoryStore(str(Path(__file__).parent / "memory.db"))

def _mask_key(key: Optional[str]) -> str:
    if not key:
        return "(not set)"
    k = str(key)
    if len(k) <= 8:
        return f"{k[:2]}…{k[-2:]} (len={len(k)})"
    return f"{k[:4]}…{k[-4:]} (len={len(k)})"

print(f"[Crew Sidecar] OPENAI_API_KEY: {_mask_key(os.getenv('OPENAI_API_KEY'))}")

# Placeholder Crew runner (swap with real crewai flows inside your env)
class SimpleCrew:
    def __init__(self, session_id: str, task: str, context: Dict[str, Any]):
        self.session_id = session_id
        self.task = task
        self.context = context
        self.messages: List[Dict[str, Any]] = []
        self.turn = 0
        self.max_turns = 5
        self.stages: List[str] = [
            "PROBLEM_CAPTURE",
            "PROBLEM_CLARIFICATION",
            "SOLUTION_BRAINSTORM",
            "COMPETITOR_ANALYSIS",
            "SCA_ANALYSIS",
            "MVP_PLANNING",
            "TASK_GENERATION",
        ]
        # Initialize stage index from context if provided
        step_id = (context or {}).get("stepId") or (context or {}).get("stageId")
        self.stage_index = self.stages.index(step_id) if step_id in self.stages else 0
        self.decision_log: List[Dict[str, Any]] = []

    def start(self):
        now = __import__("datetime").datetime.utcnow().isoformat()
        self.messages.append({
            "id": f"msg_start_{self.session_id}",
            "sender": "ai",
            "agentId": "strategic-planner",
            "agentName": "Strategic Planner",
            "agentTitle": "Planning Lead",
            "content": f"🚀 Crew assembled and ready to analyze: {self.task}",
            "timestamp": now,
            "type": "agent_contribution",
            "metadata": {"department": "Strategy", "stage": self.stages[self.stage_index]}
        })
        MEMORY.save_session(self.session_id, self.stages[self.stage_index], self.turn)
        MEMORY.save_message(self.session_id, f"msg_start_{self.session_id}", 0, self.messages[-1])

    def next(self):
        self.turn += 1
        self._process_stage_turn()

    def _append_message(self, *, agent_id: str, agent_name: str, agent_title: str, content: str, msg_type: str = "agent_contribution", options: Optional[List[str]] = None):
        now = __import__("datetime").datetime.utcnow().isoformat()
        metadata: Dict[str, Any] = {"stage": self.stages[self.stage_index]}
        if options:
            metadata["options"] = options
        self.messages.append({
            "id": f"msg_{self.turn}_{self.session_id}",
            "sender": "ai" if msg_type in ("decision_point", "user_approval") else "agent",
            "agentId": agent_id,
            "agentName": agent_name,
            "agentTitle": agent_title,
            "content": content,
            "timestamp": now,
            "type": msg_type,
            "metadata": metadata
        })
        MEMORY.save_session(self.session_id, self.stages[self.stage_index], self.turn)
        MEMORY.save_message(self.session_id, f"msg_{self.turn}_{self.session_id}", len(self.messages), self.messages[-1])

    def _process_stage_turn(self):
        stage = self.stages[self.stage_index]
        
        def stage_context_snippet(max_chars: int = 1600) -> str:
            texts: List[str] = []
            for m in self.messages:
                if m.get("metadata", {}).get("stage") == stage and m.get("type") == "agent_contribution":
                    who = m.get("agentName") or m.get("agentId") or "Agent"
                    texts.append(f"{who}: {m.get('content','')}")
            blob = "\n\n".join(texts)
            return blob[-max_chars:] if blob else "(no prior stage context)"
        # For each stage, define the sequence of roles and a decision point at the end
        # Retrieve cross-session recall: fetch latest summary for this stage (if any) and include as context hint
        prior_summary = MEMORY.get_latest_summary(self.session_id, stage)
        if prior_summary:
            # Store as a note for visibility and to influence consensus
            MEMORY.add_note(self.session_id, stage, f"[Recall] Prior summary: {prior_summary[:400]}…")

        if stage == "PROBLEM_CAPTURE":
            if self.turn == 1:
                content = self._llm_or_fallback(
                    role="Facilitator",
                    system="You help founders capture their problem succinctly.",
                    user=f"Summarize the founder's problem in 5 bullets: problem context, impacted users, primary pain, constraints, success signal. Task: {self.task}")
                self._append_message(agent_id="facilitator", agent_name="Facilitator", agent_title="Session Lead", content=content)
            elif self.turn == 2:
                content = self._llm_or_fallback(
                    role="Market Analyst",
                    system="You highlight market impact and user personas.",
                    user=f"Extract target users and demand signals for the captured problem. Give 5 crisp bullets with sources. Task: {self.task}")
                self._append_message(agent_id="market-analyst", agent_name="Market Analyst", agent_title="Go-to-Market", content=content)
            elif self.turn == 3:
                ctx = stage_context_snippet()
                content = self._llm_or_fallback(
                    role="Critical Cassandra",
                    system="You respectfully challenge assumptions and highlight risks.",
                    user=f"Review prior points and disagree where warranted with evidence. Cite specifics and propose alternatives in 4 bullets. Context:\n{ctx}")
                self._append_message(agent_id="critical-cassandra", agent_name="Critical Cassandra", agent_title="Risk Analyst", content=content)
            elif self.turn == 4:
                ctx = stage_context_snippet(2000)
                # Summarize and persist a stage summary to memory for compression
                summary = self._llm_or_fallback(
                    role="Summarizer",
                    system=instruction_for("Summarizer"),
                    user=f"Summarize the discussion so far focusing on decisions, risks, and open questions. Context:\n{ctx}"
                )
                MEMORY.save_summary(self.session_id, stage, summary)
                content = self._llm_or_fallback(
                    role="Smart Planner",
                    system="You synthesize differing viewpoints into a pragmatic consensus.",
                    user=f"Using the summary below, propose a short consensus and next steps. Summary:\n{summary}"
                )
                self._append_message(agent_id="smart-planner", agent_name="Smart Planner", agent_title="Consensus Facilitator", content=content)
            else:
                content = self._llm_or_fallback(
                    role="Smart Planner",
                    system="You propose clear decision checkpoints.",
                    user="Propose a decision to close PROBLEM_CAPTURE with options approve/refine/reject/pause in one sentence, then list 3 short options.")
                self._append_message(agent_id="smart-planner", agent_name="Smart Planner", agent_title="Decision Facilitator", content=content, msg_type="decision_point", options=["approve","refine","reject","pause"])

        elif stage == "PROBLEM_CLARIFICATION":
            if self.turn == 1:
                content = self._llm_or_fallback(
                    role="Product Manager",
                    system="You ask clarifying questions to reduce ambiguity.",
                    user=f"List 5 clarifying questions to remove ambiguity in the problem statement. Reference what is missing or risky. Task: {self.task}")
                self._append_message(agent_id="product-manager", agent_name="Product Manager", agent_title="PM", content=content)
            elif self.turn == 2:
                content = self._llm_or_fallback(
                    role="CEO",
                    system="You help narrow scope and set boundaries.",
                    user=f"Suggest a narrowed scope with must-haves vs later. Give 5 bullets that shape a 2-week discovery. Task: {self.task}")
                self._append_message(agent_id="ceo", agent_name="CEO", agent_title="Founder", content=content)
            elif self.turn == 3:
                ctx = stage_context_snippet()
                content = self._llm_or_fallback(
                    role="Critical Cassandra",
                    system="You rigorously test clarity and assumptions.",
                    user=f"Identify contradictions or ambiguities in prior points and propose 3 concrete clarifications. Context:\n{ctx}")
                self._append_message(agent_id="critical-cassandra", agent_name="Critical Cassandra", agent_title="Risk", content=content)
            elif self.turn == 4:
                ctx = stage_context_snippet(2000)
                content = self._llm_or_fallback(
                    role="Smart Planner",
                    system="You converge viewpoints into a crisp, shared understanding.",
                    user=f"Write a short consensus problem statement and success criteria based on the discussion. Context:\n{ctx}")
                self._append_message(agent_id="smart-planner", agent_name="Smart Planner", agent_title="Consensus Facilitator", content=content)
            else:
                content = self._llm_or_fallback(
                    role="Smart Planner",
                    system="You propose clear decision checkpoints.",
                    user="Propose a decision to close PROBLEM_CLARIFICATION with options approve/refine/reject/pause in one sentence, then list 3 short options.")
                self._append_message(agent_id="smart-planner", agent_name="Smart Planner", agent_title="Decision Facilitator", content=content, msg_type="decision_point", options=["approve","refine","reject","pause"])

        elif stage == "SOLUTION_BRAINSTORM":
            if self.turn == 1:
                content = self._llm_or_fallback(
                    role="CTO",
                    system="You outline simple, reliable MVP approaches.",
                    user=f"Propose 2-3 MVP solution patterns with stack choices and tradeoffs. Task: {self.task}")
                self._append_message(agent_id="cto", agent_name="CTO", agent_title="Technical Lead", content=content)
            elif self.turn == 2:
                content = self._llm_or_fallback(
                    role="Growth Hacker",
                    system="You bring GTM perspective to designs.",
                    user=f"For each proposed solution, give first-week GTM actions and success checks. Task: {self.task}")
                self._append_message(agent_id="growth-hacker", agent_name="Growth Hacker", agent_title="GTM", content=content)
            elif self.turn == 3:
                ctx = stage_context_snippet()
                content = self._llm_or_fallback(
                    role="Critical Cassandra",
                    system="You challenge solution ideas with implementation risks.",
                    user=f"Critique the proposed solutions with concrete risks, costs, and mitigations. Provide 4 bullets. Context:\n{ctx}")
                self._append_message(agent_id="critical-cassandra", agent_name="Critical Cassandra", agent_title="Risk", content=content)
            elif self.turn == 4:
                ctx = stage_context_snippet(2000)
                content = self._llm_or_fallback(
                    role="Smart Planner",
                    system="You drive to a pragmatic convergence.",
                    user=f"Select a preferred MVP pattern and justify in 4 bullets. Context:\n{ctx}")
                self._append_message(agent_id="smart-planner", agent_name="Smart Planner", agent_title="Consensus Facilitator", content=content)
            else:
                content = self._llm_or_fallback(
                    role="Smart Planner",
                    system="You propose clear decision checkpoints.",
                    user="Propose a decision to close SOLUTION_BRAINSTORM with options approve/refine/reject/pause in one sentence, then list 3 short options.")
                self._append_message(agent_id="smart-planner", agent_name="Smart Planner", agent_title="Decision Facilitator", content=content, msg_type="decision_point", options=["approve","refine","reject","pause"])

        elif stage == "COMPETITOR_ANALYSIS":
            if self.turn == 1:
                content = self._llm_or_fallback(
                    role="Research Lead",
                    system="You find competitors and alternatives.",
                    user=f"List 5 relevant competitors/alternatives with 1-line strengths and weaknesses. Task: {self.task}")
                self._append_message(agent_id="research-lead", agent_name="Research Lead", agent_title="Market Research", content=content)
            elif self.turn == 2:
                content = self._llm_or_fallback(
                    role="Data Analyst",
                    system="You quantify competitive landscape.",
                    user=f"Add 4 bullets: essential metrics to track, public sources, and quick validation steps. Task: {self.task}")
                self._append_message(agent_id="data-analyst", agent_name="Data Analyst", agent_title="Analytics", content=content)
            elif self.turn == 3:
                ctx = stage_context_snippet()
                content = self._llm_or_fallback(
                    role="Critical Cassandra",
                    system="You pressure-test positioning and moats.",
                    user=f"Challenge our differentiation vs competitors with 3 realistic counter-moves they could make. Context:\n{ctx}")
                self._append_message(agent_id="critical-cassandra", agent_name="Critical Cassandra", agent_title="Risk", content=content)
            elif self.turn == 4:
                ctx = stage_context_snippet(2000)
                content = self._llm_or_fallback(
                    role="Smart Planner",
                    system="You produce a crisp positioning consensus.",
                    user=f"Craft a one-liner positioning and 3 proof points. Context:\n{ctx}")
                self._append_message(agent_id="smart-planner", agent_name="Smart Planner", agent_title="Consensus Facilitator", content=content)
            else:
                content = self._llm_or_fallback(
                    role="Smart Planner",
                    system="You propose clear decision checkpoints.",
                    user="Propose a decision to close COMPETITOR_ANALYSIS with options approve/refine/reject/pause in one sentence, then list 3 short options.")
                self._append_message(agent_id="smart-planner", agent_name="Smart Planner", agent_title="Decision Facilitator", content=content, msg_type="decision_point", options=["approve","refine","reject","pause"])

        elif stage == "SCA_ANALYSIS":
            if self.turn == 1:
                content = self._llm_or_fallback(
                    role="Strategy Lead",
                    system="You identify sustainable competitive advantages (SCA).",
                    user=f"List 5 potential SCA levers (data, distribution, workflow lock-in, brand, regulatory). Task: {self.task}")
                self._append_message(agent_id="strategy-lead", agent_name="Strategy Lead", agent_title="Strategy", content=content)
            elif self.turn == 2:
                content = self._llm_or_fallback(
                    role="Critical Cassandra",
                    system="You rigorously pressure-test for weaknesses.",
                    user=f"Challenge each claimed SCA with top 3 risks and mitigations. Task: {self.task}")
                self._append_message(agent_id="critical-cassandra", agent_name="Critical Cassandra", agent_title="Risk", content=content)
            elif self.turn == 3:
                ctx = stage_context_snippet()
                content = self._llm_or_fallback(
                    role="CTO",
                    system="You assess technical feasibility and defensibility.",
                    user=f"Respond to risks with pragmatic mitigations and what to prototype first. Context:\n{ctx}")
                self._append_message(agent_id="cto", agent_name="CTO", agent_title="Technical Lead", content=content)
            elif self.turn == 4:
                ctx = stage_context_snippet(2000)
                content = self._llm_or_fallback(
                    role="Smart Planner",
                    system="You converge on the most realistic SCA path.",
                    user=f"Pick top 1-2 SCA bets with rationale and next steps. Context:\n{ctx}")
                self._append_message(agent_id="smart-planner", agent_name="Smart Planner", agent_title="Consensus Facilitator", content=content)
            else:
                content = self._llm_or_fallback(
                    role="Smart Planner",
                    system="You propose clear decision checkpoints.",
                    user="Propose a decision to close SCA_ANALYSIS with options approve/refine/reject/pause in one sentence, then list 3 short options.")
                self._append_message(agent_id="smart-planner", agent_name="Smart Planner", agent_title="Decision Facilitator", content=content, msg_type="decision_point", options=["approve","refine","reject","pause"])

        elif stage == "MVP_PLANNING":
            if self.turn == 1:
                content = self._llm_or_fallback(
                    role="Product Manager",
                    system="You shape an MVP feature slice.",
                    user=f"List MVP scope as 5 bullets (must-have features). Include acceptance criteria. Task: {self.task}")
                self._append_message(agent_id="product-manager", agent_name="Product Manager", agent_title="PM", content=content)
            elif self.turn == 2:
                content = self._llm_or_fallback(
                    role="DevOps",
                    system="You plan lean, reliable delivery.",
                    user=f"Outline infra plan: environments, CI/CD, observability, and low-cost ops. Task: {self.task}")
                self._append_message(agent_id="devops", agent_name="DevOps", agent_title="Platform", content=content)
            elif self.turn == 3:
                content = self._llm_or_fallback(
                    role="Finance Analyst",
                    system="You forecast first-month costs simply.",
                    user=f"Give rough month-1 budget and cost reduction levers in 4 bullets. Task: {self.task}")
                self._append_message(agent_id="finance-analyst", agent_name="Finance Analyst", agent_title="Finance", content=content)
            elif self.turn == 4:
                ctx = stage_context_snippet(2000)
                content = self._llm_or_fallback(
                    role="Smart Planner",
                    system="You align scope, delivery, and budget into a coherent plan.",
                    user=f"Produce a short MVP plan summary with risks and mitigations. Context:\n{ctx}")
                self._append_message(agent_id="smart-planner", agent_name="Smart Planner", agent_title="Consensus Facilitator", content=content)
            else:
                content = self._llm_or_fallback(
                    role="Smart Planner",
                    system="You propose clear decision checkpoints.",
                    user="Propose a decision to close MVP_PLANNING with options approve/refine/reject/pause in one sentence, then list 3 short options.")
                self._append_message(agent_id="smart-planner", agent_name="Smart Planner", agent_title="Decision Facilitator", content=content, msg_type="decision_point", options=["approve","refine","reject","pause"])

        elif stage == "TASK_GENERATION":
            if self.turn == 1:
                content = self._llm_or_fallback(
                    role="Smart Planner",
                    system="You break down work into actionable tasks.",
                    user=f"Produce a task list in bullets grouped by workstream with owners and 1-week timeline. Task: {self.task}")
                self._append_message(agent_id="smart-planner", agent_name="Smart Planner", agent_title="Execution", content=content)
            elif self.turn == 2:
                ctx = stage_context_snippet()
                content = self._llm_or_fallback(
                    role="CEO",
                    system="You prioritize ruthlessly for speed to learning.",
                    user=f"From the proposed tasks, pick top 5 to start this week with rationale. Context:\n{ctx}")
                self._append_message(agent_id="ceo", agent_name="CEO", agent_title="Founder", content=content)
            elif self.turn == 3:
                ctx = stage_context_snippet(2000)
                content = self._llm_or_fallback(
                    role="DevOps",
                    system="You ensure feasibility and sequencing.",
                    user=f"Sequence tasks to minimize risk and enable parallel work. Context:\n{ctx}")
                self._append_message(agent_id="devops", agent_name="DevOps", agent_title="Platform", content=content)
            elif self.turn == 4:
                ctx = stage_context_snippet(2000)
                content = self._llm_or_fallback(
                    role="Smart Planner",
                    system="You present a converged execution plan.",
                    user=f"Summarize final task plan and DRI ownership. Context:\n{ctx}")
                self._append_message(agent_id="smart-planner", agent_name="Smart Planner", agent_title="Consensus Facilitator", content=content)
            else:
                # Wrap up
                self._append_message(agent_id="consensus", agent_name="Consensus", agent_title="Summary", content="All stages completed. Execution plan ready.")

    def _llm_or_fallback(self, role: str, system: str, user: str) -> str:
        api_key = os.getenv("OPENAI_API_KEY")
        # Treat very short or placeholder-like keys as missing
        if not api_key or len(str(api_key)) < 20:
            raise HTTPException(status_code=401, detail="OPENAI_API_KEY missing or invalid for crew-service")
        try:
            payload = json.dumps({
                "model": os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
                "temperature": 0.4,
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": user}
                ]
            }).encode("utf-8")
            req = urlrequest.Request(
                url="https://api.openai.com/v1/chat/completions",
                data=payload,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {api_key}"
                },
                method="POST"
            )
            ssl_ctx = ssl.create_default_context(cafile=certifi.where())
            with urlrequest.urlopen(req, timeout=30, context=ssl_ctx) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                return data.get("choices", [{}])[0].get("message", {}).get("content", "") or "(no content)"
        except HTTPError as e:
            if e.code == 401:
                raise HTTPException(status_code=401, detail="OpenAI authentication failed (401)")
            raise HTTPException(status_code=502, detail=f"OpenAI HTTP error: {e.code}")
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"OpenAI call failed: {e}")

app = FastAPI()

class StartRequest(BaseModel):
    sessionId: str
    stepId: Optional[str] = None
    task: str
    context: Optional[Dict[str, Any]] = None

class NextRequest(BaseModel):
    sessionId: str

class DecisionRequest(BaseModel):
    sessionId: str
    decision: str
    userMessage: Optional[str] = None

class EmbedUpsertRequest(BaseModel):
    namespace: str
    id: str
    text: str
    vector: Optional[List[float]] = None

class EmbedQueryRequest(BaseModel):
    namespace: str
    query: str
    topK: int = 5

class ToolRegisterRequest(BaseModel):
    toolId: str
    name: str
    description: str
    schema: dict

SESSIONS: Dict[str, SimpleCrew] = {}

@app.post("/api/crew/start")
async def crew_start(req: StartRequest):
    crew = SimpleCrew(req.sessionId, req.task, req.context or {})
    crew.start()
    SESSIONS[req.sessionId] = crew
    return {"success": True, "messages": crew.messages, "stage": crew.stages[crew.stage_index]}

@app.post("/api/crew/next")
async def crew_next(req: NextRequest):
    crew = SESSIONS.get(req.sessionId)
    if not crew:
        raise HTTPException(status_code=404, detail="Session not found")
    crew.next()
    return {"success": True, "messages": crew.messages, "stage": crew.stages[crew.stage_index]}

@app.get("/api/crew/status/{session_id}")
async def crew_status(session_id: str):
    crew = SESSIONS.get(session_id)
    if not crew:
        raise HTTPException(status_code=404, detail="Session not found")
    complete = any(m.get("metadata", {}).get("complete") for m in crew.messages)
    return {"success": True, "messages": crew.messages, "turn": crew.turn, "complete": complete, "stage": crew.stages[crew.stage_index]}

@app.post("/api/crew/decision")
async def crew_decision(req: DecisionRequest):
    crew = SESSIONS.get(req.sessionId)
    if not crew:
        raise HTTPException(status_code=404, detail="Session not found")
    now = __import__("datetime").datetime.utcnow().isoformat()
    # Log decision
    crew.decision_log.append({
        "stage": crew.stages[crew.stage_index],
        "decision": req.decision,
        "userMessage": req.userMessage,
        "timestamp": now
    })
    MEMORY.save_decision(req.sessionId, crew.stages[crew.stage_index], req.decision, req.userMessage or "", now)
    # Advance on approve; refine stays; reject restarts stage; pause no-op
    if req.decision == "approve":
        # advance stage and reset turn
        crew.stage_index = min(crew.stage_index + 1, len(crew.stages) - 1)
        crew.turn = 0
        crew.messages.append({
            "id": f"msg_decision_{crew.session_id}_{crew.stage_index}",
            "sender": "ai",
            "agentId": "system",
            "content": f"Approved. Moving to next stage: {crew.stages[crew.stage_index]}",
            "timestamp": now,
            "type": "agent_contribution",
            "metadata": {"stage": crew.stages[crew.stage_index]}
        })
    elif req.decision == "reject":
        crew.turn = 0
    elif req.decision == "refine":
        # keep stage, reset turn to get more analysis
        crew.turn = 1
    elif req.decision == "pause":
        pass
    return {"success": True, "messages": crew.messages, "decisionLog": crew.decision_log, "stage": crew.stages[crew.stage_index]}

class NoteRequest(BaseModel):
    sessionId: str
    stage: Optional[str] = None
    content: str

@app.post("/api/crew/notes")
async def add_note(req: NoteRequest):
    stage = req.stage or SESSIONS.get(req.sessionId).stages[SESSIONS.get(req.sessionId).stage_index]
    MEMORY.add_note(req.sessionId, stage, req.content)
    return {"success": True}

@app.get("/api/crew/notes/{session_id}")
async def list_notes(session_id: str):
    return {"success": True, "notes": MEMORY.list_notes(session_id)}

@app.get("/api/crew/memory/{session_id}")
async def get_memory_bundle(session_id: str):
    return {"success": True, "bundle": MEMORY.get_bundle(session_id)}

class SummaryRequest(BaseModel):
    sessionId: str
    stage: Optional[str] = None

@app.post("/api/crew/summarize")
async def summarize_stage(req: SummaryRequest):
    crew = SESSIONS.get(req.sessionId)
    if not crew:
        raise HTTPException(status_code=404, detail="Session not found")
    stage = req.stage or crew.stages[crew.stage_index]
    # Collect context and build a summary
    ctx_parts = []
    for m in crew.messages:
        if m.get("metadata", {}).get("stage") == stage and m.get("type") == "agent_contribution":
            who = m.get("agentName") or m.get("agentId") or "Agent"
            ctx_parts.append(f"{who}: {m.get('content','')}")
    ctx = "\n\n".join(ctx_parts)[-2000:]
    if not ctx:
        return {"success": False, "error": "No content to summarize"}
    summary = crew._llm_or_fallback(
        role="Summarizer",
        system=instruction_for("Summarizer"),
        user=f"Summarize the discussion focusing on decisions, risks, open questions. Context:\n{ctx}"
    )
    MEMORY.save_summary(req.sessionId, stage, summary)
    return {"success": True, "summary": summary, "stage": stage}

@app.post("/api/tools/register")
async def tools_register(req: ToolRegisterRequest):
    MEMORY.register_tool(req.toolId, req.name, req.description, req.schema)
    return {"success": True}

@app.get("/api/tools/list")
async def tools_list():
    return {"success": True, "tools": MEMORY.list_tools()}

@app.get("/api/tools/traces/{session_id}")
async def tools_traces(session_id: str):
    return {"success": True, "traces": MEMORY.list_tool_calls(session_id)}

class EvalRequest(BaseModel):
    sessionId: str

@app.post("/api/eval/stage-flow")
async def eval_stage_flow(req: EvalRequest):
    bundle = MEMORY.get_bundle(req.sessionId)
    messages = bundle.get("messages", [])
    # Check that each stage has at least one decision_point after contributions
    stages_seen = {}
    for m in messages:
        st = (m.get("metadata") or {}).get("stage")
        typ = m.get("type")
        if not st:
            continue
        info = stages_seen.setdefault(st, {"contrib": 0, "decision": 0})
        if typ == "agent_contribution":
            info["contrib"] += 1
        elif typ == "decision_point":
            info["decision"] += 1
    problems = []
    for st, info in stages_seen.items():
        if info["contrib"] == 0:
            problems.append(f"Stage {st} has no contributions")
        if info["decision"] == 0:
            problems.append(f"Stage {st} missing decision point")
    return {"success": True, "stages": stages_seen, "problems": problems}

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.post("/api/embeddings/upsert")
async def embeddings_upsert(req: EmbedUpsertRequest):
    vec = req.vector or embed_text_via_llm(req.text)
    MEMORY.upsert_embedding(req.id, req.namespace, req.text, vec)
    return {"success": True, "id": req.id, "namespace": req.namespace, "dim": len(vec)}

@app.post("/api/embeddings/query")
async def embeddings_query(req: EmbedQueryRequest):
    qvec = embed_text_via_llm(req.query)
    results = MEMORY.search_embeddings(req.namespace, qvec, top_k=req.topK)
    return {"success": True, "results": results}
