from pydantic import BaseModel
from typing import List, Optional, Dict, Any

# Login Models
class LoginRequest(BaseModel):
    email: str
    password: str
    role: str = "Admin"

class LoginResponse(BaseModel):
    success: bool
    token: Optional[str] = None
    user: Optional[Dict[str, Any]] = None
    message: str

# Route Models
class RouteSummary(BaseModel):
    id: str
    demand: float
    load_factor: float
    status: str

class DemandPoint(BaseModel):
    time: str
    demand: float

class LoadPoint(BaseModel):
    route: str
    load: float

class Alert(BaseModel):
    id: int
    route: str
    message: str
    severity: str
    time: str

class DashboardStats(BaseModel):
    total_routes: int
    active_buses: int
    high_demand_routes: int
    anomalies: int
    avg_load_factor: float
    avg_demand: float

class DashboardData(BaseModel):
    stats: DashboardStats
    demand: List[DemandPoint]
    load: List[LoadPoint]
    alerts: List[Alert]

# Results Models
class OptimizationResult(BaseModel):
    route_id: int
    demand_after: float
    waiting_passengers: float
    actions: List[str]
    frequency_multiplier: float
    buses_added: int
    rerouted_to: Optional[int]
    anomaly: bool
    high_uncertainty: bool

# Route Detail Models
class Recommendation(BaseModel):
    frequency_multiplier: str
    buses_to_add: str
    reroute_suggestion: str

class ActionBadge(BaseModel):
    label: str
    color: str

class RouteDetail(BaseModel):
    demand_trend: List[Dict[str, Any]]
    load_trend: List[Dict[str, Any]]
    confidence: float
    recommendations: Recommendation
    action_badges: List[ActionBadge]

# Optimization Trigger
class OptimizeResponse(BaseModel):
    success: bool
    message: str
    summary: Dict[str, Any]
    timestamp: str

# ============== Agent Decision Models ==============

class AgentScore(BaseModel):
    """Individual agent assessment for a route"""
    agent_name: str
    agent_type: str  # "operational" | "tactical"
    score: float
    priority: int
    trust_weight: float
    emergency_flag: bool
    reasoning: str
    constraints: Dict[str, Any]

class ConflictResolution(BaseModel):
    """Details of how conflicting agent decisions were resolved"""
    route_id: int
    resolution_strategy: str  # "safety_override" | "weighted_voting" | "combined_actions"
    primary_agent: str
    supporting_agents: List[str]
    rejected_agents: List[str]
    final_action: str
    reasoning: str
    weighted_scores: Dict[str, float]

class AgentDecisionDetail(BaseModel):
    """Comprehensive agent decision data for a route"""
    route_id: int
    agent_scores: List[AgentScore]
    conflict_resolution: Optional[ConflictResolution]
    final_decision: Dict[str, Any]
    blackboard_state: Dict[str, Any]

class AgentSystemStatus(BaseModel):
    """Overall agent system status"""
    operational_agents: Dict[str, Dict[str, Any]]  # Status of 4 operational agents
    tactical_agents: Dict[str, Dict[str, Any]]  # Status of 4 tactical agents
    supervisor_status: Dict[str, Any]
    total_conflicts_resolved: int
    resolution_strategy_counts: Dict[str, int]
    average_trust_weights: Dict[str, float]

class BlackboardSnapshot(BaseModel):
    """Current state of the blackboard communication system"""
    namespaces: Dict[str, List[Dict[str, Any]]]
    system_state: Dict[str, Any]
    urgent_messages: List[Dict[str, Any]]
    last_update_time: str