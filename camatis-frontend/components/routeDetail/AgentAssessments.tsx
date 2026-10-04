"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Brain, Shield, Wrench, Cloud, TrafficCone, Users, Bus, Calendar, Route, AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { getRouteAgentDetail } from "@/lib/api";

interface AgentScore {
  agent_name: string;
  agent_type: string;
  score: number;
  priority: number;
  trust_weight: number;
  emergency_flag: boolean;
  reasoning: string;
  constraints: Record<string, any>;
}

interface AgentDecisionDetail {
  route_id: number;
  agent_scores: AgentScore[];
  conflict_resolution: any;
  final_decision: any;
  blackboard_state: any;
}

export default function AgentAssessments({ routeId }: { routeId: string }) {
  const [detail, setDetail] = useState<AgentDecisionDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const numericId = parseInt(routeId.replace("R-", ""));
        const data = await getRouteAgentDetail(numericId);
        setDetail(data);
      } catch (error) {
        console.error("Failed to fetch agent detail:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [routeId]);

  const getAgentIcon = (agentName: string) => {
    if (agentName.includes("Driver")) return Shield;
    if (agentName.includes("Vehicle")) return Wrench;
    if (agentName.includes("Weather")) return Cloud;
    if (agentName.includes("Congestion")) return TrafficCone;
    if (agentName.includes("Demand")) return Users;
    if (agentName.includes("Fleet")) return Bus;
    if (agentName.includes("Scheduling")) return Calendar;
    if (agentName.includes("Route")) return Route;
    return Brain;
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.7) return "text-green-600 bg-green-50 border-green-200";
    if (score >= 0.5) return "text-yellow-600 bg-yellow-50 border-yellow-200";
    return "text-red-600 bg-red-50 border-red-200";
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 8) return "bg-red-500";
    if (priority >= 5) return "bg-orange-500";
    return "bg-yellow-500";
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Agent Assessments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!detail || !detail.agent_scores || detail.agent_scores.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Agent Assessments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Brain size={48} className="text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-600">No agent assessment data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const operationalAgents = detail.agent_scores.filter(a => a.agent_type === "operational");
  const tacticalAgents = detail.agent_scores.filter(a => a.agent_type === "tactical");

  return (
    <div className="space-y-4">
      {/* Conflict Resolution (if present) */}
      {detail.conflict_resolution && (
        <Card className="border-2 border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle size={20} className="text-orange-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-orange-900 mb-1">
                  Conflict Resolved: {detail.conflict_resolution.resolution_strategy.replace(/_/g, " ").toUpperCase()}
                </p>
                <p className="text-xs text-orange-700 mb-2">
                  {detail.conflict_resolution.reasoning}
                </p>
                <div className="flex items-center gap-4 text-xs">
                  <span className="text-orange-600">
                    <span className="font-semibold">Primary:</span> {detail.conflict_resolution.primary_agent}
                  </span>
                  {detail.conflict_resolution.rejected_agents && detail.conflict_resolution.rejected_agents.length > 0 && (
                    <span className="text-orange-600">
                      <span className="font-semibold">Rejected:</span> {detail.conflict_resolution.rejected_agents.length} agent(s)
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Operational Layer Assessments */}
      {operationalAgents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Operational Layer Assessments</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Real-time monitoring agents (high trust weights 1.2-1.5)
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {operationalAgents.map((agent, idx) => {
                const Icon = getAgentIcon(agent.agent_name);
                return (
                  <div key={idx} className="p-3 border-2 border-slate-200 rounded-lg">
                    <div className="flex items-start gap-3 mb-2">
                      <div className="p-2 bg-slate-700 text-white rounded-lg">
                        <Icon size={20} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-semibold text-slate-800">{agent.agent_name}</p>
                          {agent.emergency_flag && (
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-semibold rounded border border-red-300">
                              EMERGENCY
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mb-2">
                          <div className={`px-2 py-1 rounded border ${getScoreColor(agent.score)}`}>
                            <p className="text-xs font-semibold">
                              Score: {(agent.score * 100).toFixed(0)}%
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className={`w-2 h-2 rounded-full ${getPriorityColor(agent.priority)}`}></div>
                            <p className="text-xs text-slate-600">
                              Priority: {agent.priority}/10
                            </p>
                          </div>
                          <p className="text-xs text-indigo-600 font-semibold">
                            Trust: {agent.trust_weight.toFixed(2)}x
                          </p>
                        </div>
                        <p className="text-xs text-slate-600 mb-2">{agent.reasoning}</p>
                        {Object.keys(agent.constraints).length > 0 && (
                          <div className="mt-2 p-2 bg-slate-50 rounded border border-slate-200">
                            <p className="text-xs font-semibold text-slate-700 mb-1">Constraints:</p>
                            {Object.entries(agent.constraints).map(([key, value]) => (
                              <p key={key} className="text-xs text-slate-600">
                                • {key.replace(/_/g, " ")}: {typeof value === "boolean" ? (value ? "Yes" : "No") : String(value)}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tactical Layer Assessments */}
      {tacticalAgents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Tactical Layer Assessments</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Decision-making agents (trust weights 0.8-1.0)
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {tacticalAgents.map((agent, idx) => {
                const Icon = getAgentIcon(agent.agent_name);
                return (
                  <div key={idx} className="p-3 border-2 border-slate-200 rounded-lg">
                    <div className="flex items-start gap-3 mb-2">
                      <div className="p-2 bg-blue-600 text-white rounded-lg">
                        <Icon size={20} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-slate-800 mb-1">{agent.agent_name}</p>
                        <div className="flex items-center gap-3 mb-2">
                          <div className={`px-2 py-1 rounded border ${getScoreColor(agent.score)}`}>
                            <p className="text-xs font-semibold">
                              Score: {(agent.score * 100).toFixed(0)}%
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className={`w-2 h-2 rounded-full ${getPriorityColor(agent.priority)}`}></div>
                            <p className="text-xs text-slate-600">
                              Priority: {agent.priority}/10
                            </p>
                          </div>
                          <p className="text-xs text-blue-600 font-semibold">
                            Trust: {agent.trust_weight.toFixed(2)}x
                          </p>
                        </div>
                        <p className="text-xs text-slate-600">{agent.reasoning}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Final Decision */}
      <Card className="border-2 border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-green-900">Final Decision</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {detail.final_decision.actions ? (
              detail.final_decision.actions.map((action: string, idx: number) => (
                <div key={idx} className="p-2 bg-white border border-green-200 rounded">
                  <p className="text-sm font-semibold text-green-800">• {action}</p>
                </div>
              ))
            ) : detail.final_decision.action ? (
              <div className="p-2 bg-white border border-green-200 rounded">
                <p className="text-sm font-semibold text-green-800">• {detail.final_decision.action}</p>
              </div>
            ) : (
              <p className="text-sm text-slate-600">No specific action taken</p>
            )}
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="p-2 bg-white rounded border border-green-200">
                <p className="text-xs text-slate-600">Demand</p>
                <p className="text-sm font-semibold text-slate-800">
                  {detail.final_decision.demand?.toFixed(0) || "N/A"}
                </p>
              </div>
              <div className="p-2 bg-white rounded border border-green-200">
                <p className="text-xs text-slate-600">Load Factor</p>
                <p className="text-sm font-semibold text-slate-800">
                  {detail.final_decision.load ? (detail.final_decision.load * 100).toFixed(1) + "%" : "N/A"}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
