from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import random
import math
import hashlib
import time
import numpy as np
from sklearn.cluster import KMeans

router = APIRouter(prefix="/student", tags=["student"])

# -------------------------------------------------------------
# 1. SYNTHETIC STUDENT DATABASE & PROFILE BUILDER
# -------------------------------------------------------------
# We pre-generate 10 detailed student digital twins.
# Each student profile includes:
# - Core stats (Motivation, Burnout, Style, Attention, Collaboration, Stress, CGPA)
# - Personality traits (Discipline, Curiosity, Persistence, etc.)
# - Gamification metrics (streak, badges, XP)
# - Attention analytics (peak study hours, assignment timing)
# - Behavior embeddings (64D vector)
# - Trajectory Map history (30 days of metrics)
# - SHAP explanations (why they are at risk)

students_db: Dict[str, Dict[str, Any]] = {}
student_ids = [str(101 + i) for i in range(10)]
student_names = [
    "Emma Watson", "Liam Neeson", "Olivia Rodrigo", "Noah Centineo", 
    "Sophia Loren", "Jackson Pollock", "Ava Gardner", "Lucas Hedges", 
    "Isabella Swan", "Daniel Radcliffe"
]

learning_styles = ["Visual", "Auditory", "Kinesthetic", "Read/Write"]
attention_trends = ["Stable", "Declining", "Improving", "Fluctuating"]
personality_traits_pool = ["Discipline", "Curiosity", "Persistence", "Collaboration", "Leadership", "Creativity", "Self-learning"]
badges_pool = ["Explorer", "Achiever", "Scholar", "Leader", "Visionary", "Streak Master", "Consistent Learner"]

# Generate static profiles once on startup
def generate_synthetic_database():
    random.seed(42)  # For reproducibility
    np.random.seed(42)
    
    for idx, sid in enumerate(student_ids):
        name = student_names[idx]
        
        # Core metrics tailored to make students unique
        if sid == "102":  # Liam Neeson - High Burnout, Declining Attention
            motivation = 42
            burnout_risk = "High"
            style = "Kinesthetic"
            attention = "Declining"
            collab_index = 35
            stress_prob = 82
            cgpa = 6.2
        elif sid == "103":  # Olivia Rodrigo - Medium risk student
            motivation = 82
            burnout_risk = "Medium"
            style = "Visual"
            attention = "Declining"
            collab_index = 80
            stress_prob = 67
            cgpa = 8.2
        elif sid == "105":  # Sophia Loren - High Achiever
            motivation = 94
            burnout_risk = "Low"
            style = "Read/Write"
            attention = "Stable"
            collab_index = 85
            stress_prob = 25
            cgpa = 9.5
        elif sid == "106":  # Jackson Pollock - Creative, High Stress
            motivation = 68
            burnout_risk = "High"
            style = "Visual"
            attention = "Fluctuating"
            collab_index = 45
            stress_prob = 78
            cgpa = 7.1
        else:  # General random but realistic distributions
            motivation = random.randint(65, 90)
            burnout_risk = "Low" if motivation > 80 else "Medium"
            style = random.choice(learning_styles)
            attention = random.choice(attention_trends)
            collab_index = random.randint(50, 90)
            stress_prob = random.randint(30, 65)
            cgpa = round(random.uniform(7.0, 9.0), 2)

        # Personality discovery scores
        personality = {
            "Discipline": random.randint(75, 98) if cgpa > 8.5 else random.randint(40, 75),
            "Curiosity": random.randint(70, 98) if style in ["Visual", "Read/Write"] else random.randint(50, 80),
            "Persistence": random.randint(80, 99) if sid in ["105", "101", "110"] else random.randint(45, 80),
            "Collaboration": collab_index,
            "Leadership": random.randint(60, 95) if collab_index > 75 else random.randint(30, 60),
            "Creativity": random.randint(80, 98) if style == "Kinesthetic" or sid in ["106", "103"] else random.randint(40, 80),
            "Self-learning": random.randint(80, 98) if cgpa > 9.0 else random.randint(50, 80)
        }

        # Attention analytics
        peak_hours = "7:00 PM - 9:00 PM" if idx % 2 == 0 else "10:00 AM - 12:00 PM"
        if sid == "102":
            peak_hours = "1:00 AM - 3:00 AM (Late night study loop)"
        
        attention_analytics = {
            "login_frequency": "Daily" if cgpa > 8.0 else "2-3 times/week",
            "assignment_timing": "Average 2.5 days before deadline" if cgpa > 8.5 else "Average 4 hours before deadline",
            "study_patterns": "Consistent study sessions" if cgpa > 8.0 else "Cramming before assessments",
            "late_night_usage_rate": "12%" if cgpa > 8.0 else "68%",
            "consistency_score": motivation - 5,
            "peak_performance_hours": peak_hours
        }

        # Gamification Profile
        xp = int(cgpa * 1200) + motivation * 5
        level = "Visionary" if xp > 10000 else ("Scholar" if xp > 8000 else ("Achiever" if xp > 5000 else "Explorer"))
        badges = random.sample(badges_pool, k=3 if cgpa > 8.0 else 1)
        if "Consistent Learner" not in badges and cgpa > 9.0:
            badges.append("Consistent Learner")

        gamification = {
            "level": level,
            "learning_streak": random.randint(5, 28) if cgpa > 8.0 else random.randint(0, 3),
            "xp_points": xp,
            "badges": badges
        }

        # Trajectory history (30 days of metrics)
        history_30d = []
        base_cgpa = cgpa
        base_motivation = motivation
        base_stress = stress_prob
        base_focus = collab_index + 10 if collab_index < 90 else collab_index

        for d in range(30):
            # simulate a trajectory with noise and trend
            day_noise = math.sin(d / 4) * 5 + random.uniform(-3, 3)
            # Declining trend for Liam (102), improving for 104, stable for Sophia (105)
            if sid == "102":
                trend_factor = - (d * 0.7)
            elif sid == "104":
                trend_factor = + (d * 0.4)
            else:
                trend_factor = 0
                
            history_30d.append({
                "day": d + 1,
                "focus": max(10, min(100, int(base_focus + day_noise * 0.8 + trend_factor))),
                "motivation": max(10, min(100, int(base_motivation + day_noise + trend_factor * 1.2))),
                "stress": max(10, min(100, int(base_stress - day_noise * 0.5 - trend_factor * 0.8))),
                "consistency": max(10, min(100, int((base_motivation - 5) + day_noise * 0.6 + trend_factor)))
            })

        # Explainable AI (SHAP factors)
        if burnout_risk == "High":
            shap_values = [
                {"factor": "Attendance Decline", "weight": "+23%", "positive": True},
                {"factor": "Late Assignment Submissions", "weight": "+18%", "positive": True},
                {"factor": "Reduced Forum Engagement", "weight": "+11%", "positive": True},
                {"factor": "Office Hour Participation", "weight": "-7%", "positive": False}
            ]
        elif burnout_risk == "Medium":
            shap_values = [
                {"factor": "Stress Probability Spike", "weight": "+15%", "positive": True},
                {"factor": "Inconsistent Login Freq", "weight": "+12%", "positive": True},
                {"factor": "Peer Group Activity", "weight": "-8%", "positive": False},
                {"factor": "Quiz Performance", "weight": "-5%", "positive": False}
            ]
        else:
            shap_values = [
                {"factor": "Study Consistency", "weight": "+25%", "positive": False},
                {"factor": "Early Submissions", "weight": "+15%", "positive": False},
                {"factor": "High Forum Responded", "weight": "+10%", "positive": False},
                {"factor": "Burnout Level", "weight": "-3%", "positive": True}
            ]

        # 64D behavior embeddings representation.
        # We model this by drawing from 3 distinct Gaussian centers (high performance, medium, at-risk)
        if cgpa > 8.8:
            center = 1.0
        elif cgpa < 7.0:
            center = -1.0
        else:
            center = 0.0
        embedding = np.random.normal(loc=center, scale=0.3, size=(64,)).tolist()

        students_db[sid] = {
            "user_id": sid,
            "name": name,
            "motivation": motivation,
            "burnout_risk": burnout_risk,
            "learning_style": style,
            "attention_trend": attention,
            "collaboration_index": collab_index,
            "stress_probability": stress_prob,
            "cgpa": cgpa,
            "personality_traits": personality,
            "attention_analytics": attention_analytics,
            "gamification": gamification,
            "trajectory_history": history_30d,
            "explainable_ai": shap_values,
            "embedding": embedding
        }

# Trigger DB seed
generate_synthetic_database()


# -------------------------------------------------------------
# 2. Pydantic Models for API Validation
# -------------------------------------------------------------
class SimulationInput(BaseModel):
    attendance_change: float  # e.g., -10.0 (drops by 10%)
    assignment_change: float  # e.g., 5.0 (improves by 5%)
    engagement_change: float  # e.g., 20.0 (doubles or rises 20%)

class InterventionInput(BaseModel):
    action: str  # "mentor_session", "peer_learning", "reduce_workload", "weekly_checkins"

class CoachMessageInput(BaseModel):
    message: str

# -------------------------------------------------------------
# 3. ROUTE ENDPOINTS
# -------------------------------------------------------------

@router.get("/list")
def get_students_list():
    """
    Returns high-level summaries of all student digital twins.
    """
    summary_list = []
    for sid, s in students_db.items():
        summary_list.append({
            "user_id": s["user_id"],
            "name": s["name"],
            "cgpa": s["cgpa"],
            "burnout_risk": s["burnout_risk"],
            "motivation": s["motivation"],
            "stress_probability": s["stress_probability"],
            "learning_style": s["learning_style"]
        })
    return summary_list

@router.get("/profile/{student_id}")
def get_student_profile(student_id: str):
    """
    Returns the complete Digital Twin behavioural profile.
    """
    if student_id not in students_db:
        raise HTTPException(status_code=404, detail="Student digital twin profile not found")
    return students_db[student_id]

@router.post("/profile/{student_id}/simulate")
def simulate_student_future(student_id: str, payload: SimulationInput):
    """
    Future Simulator Engine. Predicts CGPA & Dropout risk based on scenario sliders.
    """
    if student_id not in students_db:
        raise HTTPException(status_code=404, detail="Student digital twin profile not found")
    
    student = students_db[student_id]
    current_cgpa = student["cgpa"]
    current_burnout = student["stress_probability"]
    
    # Calculate simulated effects using a simplistic regression formula
    # Attendance drop reduces CGPA, engagement increase boosts it, etc.
    att_eff = payload.attendance_change * 0.05
    asg_eff = payload.assignment_change * 0.04
    eng_eff = payload.engagement_change * 0.03
    
    cgpa_delta = att_eff + asg_eff + eng_eff
    simulated_cgpa = max(4.0, min(10.0, round(current_cgpa + cgpa_delta, 2)))
    
    # Risk impacts
    stress_delta = - (payload.engagement_change * 0.4) - (payload.assignment_change * 0.2) + (payload.attendance_change * -0.5 if payload.attendance_change < 0 else 0)
    simulated_stress = max(10, min(100, int(current_burnout + stress_delta)))
    
    risk_increase = int((current_burnout - simulated_stress) * -1.2)
    if risk_increase < 0:
        risk_increase = 0
        
    dropout_base = 5 if student["burnout_risk"] == "Low" else (25 if student["burnout_risk"] == "Medium" else 60)
    simulated_dropout = max(2, min(98, int(dropout_base + risk_increase * 0.6)))
    
    # Calculate recovery chance
    recovery_chance = max(10, min(95, int(100 - simulated_dropout - (simulated_stress * 0.3))))
    
    return {
        "student_id": student_id,
        "current_cgpa": current_cgpa,
        "simulated_cgpa": simulated_cgpa,
        "cgpa_change": round(simulated_cgpa - current_cgpa, 2),
        "risk_increase_pct": risk_increase,
        "dropout_risk_pct": simulated_dropout,
        "recovery_chance_pct": recovery_chance
    }

@router.post("/profile/{student_id}/intervention")
def recommend_intervention(student_id: str, payload: InterventionInput):
    """
    Intervention Recommendation Engine.
    Computes recovery curve and stats based on selected intervention.
    """
    if student_id not in students_db:
        raise HTTPException(status_code=404, detail="Student digital twin profile not found")
        
    student = students_db[student_id]
    action = payload.action.lower()
    
    interventions = {
        "mentor_session": {
            "title": "One-on-One Mentorship Session",
            "recovery_chance": 84 if student["burnout_risk"] == "High" else 92,
            "cgpa_impact": "+0.4 CGPA potential",
            "stress_impact": "-15% stress level",
            "reason": "Direct guidance addresses cognitive blocks and aligns focus strategies."
        },
        "peer_learning": {
            "title": "Peer Learning Group Placement",
            "recovery_chance": 75 if student["burnout_risk"] == "High" else 88,
            "cgpa_impact": "+0.3 CGPA potential",
            "stress_impact": "-5% stress level",
            "reason": "Social interaction increases classroom belonging and collaborative learning index."
        },
        "reduce_workload": {
            "title": "Reduced Academic Workload Plan",
            "recovery_chance": 94,
            "cgpa_impact": "-0.1 CGPA potential",
            "stress_impact": "-38% stress level",
            "reason": "Providing a 10-day buffer immediately mitigates severe academic burnout risk."
        },
        "weekly_checkins": {
            "title": "Weekly Behavioral Check-ins",
            "recovery_chance": 80,
            "cgpa_impact": "+0.2 CGPA potential",
            "stress_impact": "-10% stress level",
            "reason": "Establishing consistency anchors builds steady study habit loops."
        }
    }
    
    res = interventions.get(action, interventions["mentor_session"])
    return res

@router.post("/profile/{student_id}/coach")
def chat_with_behavior_coach(student_id: str, payload: CoachMessageInput):
    """
    AI Behaviour Coach integrated. Simulates a Multi-Agent AI system pipeline.
    """
    if student_id not in students_db:
        raise HTTPException(status_code=404, detail="Student digital twin profile not found")
        
    student = students_db[student_id]
    name = student["name"]
    msg = payload.message.lower()
    
    # Generate multi-agent reasoning logs
    analyst_log = ""
    predictor_log = ""
    mentor_log = ""
    alert_log = ""
    explainer_log = ""
    chatbot_response = ""
    
    # Tailor based on student performance
    if student["cgpa"] < 7.5:
        analyst_log = f"Analyst Agent: Audited {name}'s activity logs. Detected 35% decrease in portal engagement, average submission time is 1.2 hours before deadlines, and late-night usage is highly concentrated between 1AM and 4AM."
        predictor_log = f"Predictor Agent: Projecting CGPA decrease to {round(student['cgpa'] - 0.4, 2)} for the current semester if study consistency remains below 50%."
        alert_log = f"Alert Agent: CRITICAL WARNING: Student is in the High Burnout Cluster (stress probability {student['stress_probability']}%). High probability of dropout risk (+18% department baseline)."
        explainer_log = f"Explainer Agent: Model risk prediction is driven by low classroom attendance (importance weight +23%) and high study inconsistency (importance weight +18%)."
        
        if "stress" in msg or "burnout" in msg:
            mentor_log = "Mentor Agent: Suggesting immediate 30% reduction in assignment milestones, paired with a visual study roadmap."
            chatbot_response = f"Hi {name}, I've analyzed your learning patterns with our Multi-Agent system. The Analyst Agent reports high late-night study cycles that are causing severe fatigue. To lower your burnout, I suggest taking a short 3-day load-shedding buffer and scheduling a peer learning session. We can recover your progress step-by-step!"
        else:
            mentor_log = "Mentor Agent: Suggesting weekly 1-on-1 check-ins and placing the student in an auditory study group."
            chatbot_response = f"I hear you. Looking at your digital twin metrics, your study consistency has dropped. The Predictor Agent forecasts a potential drop in CGPA if we don't adjust. I recommend studying in smaller, focused blocks of 40 minutes before 9:00 PM, and setting up weekly check-ins with your peer group."
    else:
        analyst_log = f"Analyst Agent: Audited {name}'s activity logs. Portal engagement is in the top 15% tier. Consistency is high (score {student['motivation'] - 5}). Login times are highly consistent."
        predictor_log = f"Predictor Agent: Projecting steady academic trajectory. Estimated semester CGPA: {student['cgpa']} - {min(10.0, student['cgpa'] + 0.2)}."
        alert_log = f"Alert Agent: Telemetry indicates stable behavioral profile. No alerts active."
        explainer_log = f"Explainer Agent: Stable status is attributed to high study consistency (weight +25%) and early assignment submissions (weight +15%)."
        mentor_log = "Mentor Agent: Proposing advanced elective recommendations and leadership role assignments."
        
        chatbot_response = f"Great to chat, {name}! Your behavioral twin profile looks excellent. You have a high consistency score of {student['motivation'] - 5}%. The Mentor Agent recommends checking out some advanced project sandboxes to showcase your creativity and leadership skills. Keep up the amazing work!"

    return {
        "chatbot_response": chatbot_response,
        "agents": {
            "analyst": analyst_log,
            "predictor": predictor_log,
            "mentor": mentor_log,
            "alert": alert_log,
            "explainer": explainer_log
        }
    }

@router.get("/knowledge-graph")
def get_behavior_knowledge_graph():
    """
    Generates a collaboration and influence network graph.
    Returns nodes (students) and links (interactions).
    """
    nodes = []
    # Cluster colors for node representations
    for sid, s in students_db.items():
        val = s["cgpa"]
        group_id = 0 if val > 8.8 else (2 if val < 7.0 else 1)
        nodes.append({
            "id": s["user_id"],
            "label": s["name"],
            "val": val,
            "group": group_id,  # 0: High, 1: Medium, 2: At-Risk
            "style": s["learning_style"],
            "motivation": s["motivation"]
        })
        
    links = [
        {"source": "101", "target": "103", "value": 4, "type": "peer_learning"},
        {"source": "103", "target": "104", "value": 3, "type": "study_group"},
        {"source": "105", "target": "101", "value": 5, "type": "mentorship"},
        {"source": "105", "target": "108", "value": 4, "type": "project_collab"},
        {"source": "108", "target": "110", "value": 3, "type": "peer_feedback"},
        {"source": "104", "target": "107", "value": 2, "type": "study_group"},
        {"source": "102", "target": "107", "value": 1, "type": "support"},
        {"source": "106", "target": "103", "value": 3, "type": "project_collab"},
        {"source": "109", "target": "110", "value": 5, "type": "peer_learning"},
        {"source": "106", "target": "109", "value": 2, "type": "study_group"}
    ]
    
    return {"nodes": nodes, "links": links}

@router.get("/embeddings")
def get_student_embeddings():
    """
    Runs KMeans clustering on the 64D behavior embeddings.
    Returns 2D PCA-like coordinates for scatter plots.
    """
    vectors = []
    ids = []
    for sid, s in students_db.items():
        vectors.append(s["embedding"])
        ids.append(sid)
        
    X = np.array(vectors)
    
    # Run scikit-learn KMeans
    n_clusters = 3
    kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
    clusters = kmeans.fit_predict(X).tolist()
    
    # Create simple 2D projection coordinates based on student types
    # (Mimicking t-SNE projection coordinates for visual representation)
    projections = {}
    for idx, sid in enumerate(ids):
        student = students_db[sid]
        cgpa = student["cgpa"]
        stress = student["stress_probability"]
        
        # Draw distinct coordinates per student to scatter nicely
        x_coord = float(cgpa * 2.5 - 18.0 + np.random.normal(0, 0.2))
        y_coord = float(stress * 0.15 - 5.0 + np.random.normal(0, 0.2))
        
        projections[sid] = {
            "user_id": sid,
            "name": student["name"],
            "cluster": clusters[idx],
            "x": x_coord,
            "y": y_coord,
            "cgpa": cgpa,
            "stress": stress,
            "burnout_risk": student["burnout_risk"]
        }
        
    cluster_meta = [
        {"id": 0, "name": "Hyper-Focused Achievers", "color": "#5af3aa"},
        {"id": 1, "name": "Collaborative Pathfinders", "color": "#5ae1f7"},
        {"id": 2, "name": "Vulnerable Burnout Candidates", "color": "#ff6e6e"}
    ]
    
    return {
        "points": list(projections.values()),
        "clusters": cluster_meta
    }

# -------------------------------------------------------------
# 4. BEHAVIOR SANDBOX MACHINE LEARNING ENGINE
# -------------------------------------------------------------
class SandboxTrainInput(BaseModel):
    model_type: str  # "LSTM", "Transformer", "XGBoost", "Random Forest", "Neural Network"
    epochs: int
    learning_rate: float

@router.post("/sandbox/train")
def train_sandbox_model(payload: SandboxTrainInput):
    """
    Trains/Simulates a machine learning pipeline on the student dataset.
    Returns metrics (Accuracy, Precision, Recall, Loss timeline) for comparing algorithms.
    """
    model = payload.model_type
    epochs = payload.epochs
    lr = payload.learning_rate
    
    # Calculate simulated metrics representing realistic algorithm trade-offs
    # e.g., XGBoost is fast and accurate, LSTM handles sequential history well, etc.
    time.sleep(0.6)  # Mock training delay
    
    base_accuracy = 0.72
    base_precision = 0.70
    base_recall = 0.68
    training_time = 0.5
    
    # Adjust parameters slightly based on epochs and learning rates
    lr_modifier = -0.05 if (lr > 0.05 or lr < 0.0001) else 0.02
    epoch_modifier = 0.05 if epochs >= 10 else -0.04
    
    if model == "LSTM":
        base_accuracy = 0.84
        base_precision = 0.82
        base_recall = 0.85
        training_time = 2.4 * (epochs / 5.0)
    elif model == "Transformer":
        base_accuracy = 0.88
        base_precision = 0.87
        base_recall = 0.86
        training_time = 4.8 * (epochs / 5.0)
    elif model == "XGBoost":
        base_accuracy = 0.81
        base_precision = 0.83
        base_recall = 0.78
        training_time = 0.3
    elif model == "Random Forest":
        base_accuracy = 0.79
        base_precision = 0.80
        base_recall = 0.76
        training_time = 0.2
    elif model == "Neural Network":
        base_accuracy = 0.78
        base_precision = 0.75
        base_recall = 0.77
        training_time = 1.1 * (epochs / 5.0)
        
    accuracy = min(0.99, max(0.40, base_accuracy + lr_modifier + epoch_modifier))
    precision = min(0.99, max(0.40, base_precision + lr_modifier + epoch_modifier * 0.8))
    recall = min(0.99, max(0.40, base_recall + lr_modifier + epoch_modifier * 1.1))
    
    # Loss curves
    loss_history = []
    curr_loss = 0.8
    for e in range(1, epochs + 1):
        curr_loss = curr_loss * (0.85 - (lr * 0.5)) + random.uniform(0.01, 0.04)
        loss_history.append({"epoch": e, "loss": round(curr_loss, 4)})
        
    return {
        "model": model,
        "metrics": {
            "accuracy": round(accuracy * 100, 2),
            "precision": round(precision * 100, 2),
            "recall": round(recall * 100, 2),
            "f1_score": round(2 * (accuracy * recall) / (accuracy + recall) * 100, 2),
            "training_time_seconds": round(training_time, 3)
        },
        "loss_history": loss_history
    }


# -------------------------------------------------------------
# 5. COHORT COMPARISON ENDPOINT
# -------------------------------------------------------------
@router.get("/cohort/compare")
def get_cohort_comparisons():
    """
    Returns metrics comparing different groups / cohorts of students.
    """
    return {
        "departmental": [
            {"group": "Computer Science", "avg_cgpa": 8.12, "burnout_risk_avg": "Medium", "participation": 82},
            {"group": "Mechanical Eng", "avg_cgpa": 7.45, "burnout_risk_avg": "Low", "participation": 65},
            {"group": "Business School", "avg_cgpa": 7.89, "burnout_risk_avg": "Medium", "participation": 74},
            {"group": "Design & Arts", "avg_cgpa": 8.35, "burnout_risk_avg": "High", "participation": 91}
        ],
        "class_comparison": {
            "class_a": {"name": "First Year Seminars", "avg_cgpa": 7.55, "avg_engagement": 62, "stress_index": 71},
            "class_b": {"name": "Senior Capstones", "avg_cgpa": 8.42, "avg_engagement": 88, "stress_index": 48}
        }
    }


# -------------------------------------------------------------
# 6. GENAI INSIGHT GENERATOR
# -------------------------------------------------------------
@router.get("/profile/{student_id}/insights")
def get_genai_insights(student_id: str):
    """
    GenAI Insight Generator. Provides executive summaries.
    """
    if student_id not in students_db:
        raise HTTPException(status_code=404, detail="Student digital twin profile not found")
        
    student = students_db[student_id]
    name = student["name"]
    cgpa = student["cgpa"]
    stress = student["stress_probability"]
    
    if student["burnout_risk"] == "High":
        text = (
            f"EXECUTIVE SUMMARY: During the past 30 days, {name}'s engagement levels decreased steadily "
            f"by 28% while stress levels surged to {stress}%. Our Explainer Agent indicates that early late-night portal access "
            f"corresponds with declining quiz scores. Immediate intervention (such as a workload reduction plan) is predicted "
            f"to yield an 84% recovery chance, reclaiming up to 0.4 CGPA potential."
        )
    elif student["burnout_risk"] == "Medium":
        text = (
            f"EXECUTIVE SUMMARY: {name} exhibits fluctuating engagement. A moderate burnout risk is present. "
            f"Although motivation remains stable at {student['motivation']}%, study consistency is highly volatile. "
            f"Placing {name} in a collaborative Peer Learning Group is highly recommended to anchor study habits "
            f"and improve academic persistence."
        )
    else:
        text = (
            f"EXECUTIVE SUMMARY: {name} is performing in the upper quartile with a CGPA of {cgpa}. "
            f"Activity maps show high consistency and early project uploads. Attention cycles are locked into "
            f"optimal daytime hours. The model forecasts a stable and high-performing trajectory. Suggest "
            f"curating advanced leadership or research opportunities."
        )
        
    return {
        "student_id": student_id,
        "insight": text
    }
