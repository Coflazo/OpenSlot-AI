// A* route planner inspired by https://github.com/OanaGaskey/Route-Planner.
// Static Vienna graph for demo; production swaps the graph for Google Maps Routes API or OSRM
// behind the same `estimateRouteMinutes` signature.

export interface RouteNode {
  id: string;
  label: string;
  lat: number;
  lng: number;
  neighbors: { nodeId: string; minutes: number; distanceKm: number }[];
}

export const routeGraph: Record<string, RouteNode> = {
  clinic_innere_stadt: {
    id: "clinic_innere_stadt",
    label: "Vienna Private Imaging — Innere Stadt",
    lat: 48.2082,
    lng: 16.3738,
    neighbors: [
      { nodeId: "vienna_1060", minutes: 12, distanceKm: 3.1 },
      { nodeId: "vienna_1070", minutes: 14, distanceKm: 3.4 },
      { nodeId: "vienna_1010", minutes: 4, distanceKm: 0.8 },
      { nodeId: "vienna_1020", minutes: 9, distanceKm: 2.4 },
      { nodeId: "vienna_1100", minutes: 22, distanceKm: 6.8 },
      { nodeId: "vienna_1190", minutes: 24, distanceKm: 7.2 }
    ]
  },
  clinic_mariahilf: {
    id: "clinic_mariahilf",
    label: "Vienna Private Imaging — Mariahilf",
    lat: 48.1986,
    lng: 16.3478,
    neighbors: [
      { nodeId: "vienna_1060", minutes: 5, distanceKm: 0.9 },
      { nodeId: "vienna_1070", minutes: 6, distanceKm: 1.2 },
      { nodeId: "vienna_1150", minutes: 11, distanceKm: 2.9 },
      { nodeId: "vienna_1010", minutes: 9, distanceKm: 2.0 }
    ]
  },
  vienna_1010: {
    id: "vienna_1010",
    label: "1010 — Innere Stadt",
    lat: 48.2082,
    lng: 16.3738,
    neighbors: [
      { nodeId: "clinic_innere_stadt", minutes: 4, distanceKm: 0.8 },
      { nodeId: "vienna_1020", minutes: 8, distanceKm: 2.1 },
      { nodeId: "vienna_1060", minutes: 11, distanceKm: 2.7 }
    ]
  },
  vienna_1020: {
    id: "vienna_1020",
    label: "1020 — Leopoldstadt",
    lat: 48.2169,
    lng: 16.4034,
    neighbors: [
      { nodeId: "clinic_innere_stadt", minutes: 9, distanceKm: 2.4 },
      { nodeId: "vienna_1010", minutes: 8, distanceKm: 2.1 },
      { nodeId: "vienna_1220", minutes: 18, distanceKm: 5.6 }
    ]
  },
  vienna_1060: {
    id: "vienna_1060",
    label: "1060 — Mariahilf",
    lat: 48.199,
    lng: 16.349,
    neighbors: [
      { nodeId: "clinic_innere_stadt", minutes: 12, distanceKm: 3.1 },
      { nodeId: "clinic_mariahilf", minutes: 5, distanceKm: 0.9 },
      { nodeId: "vienna_1070", minutes: 6, distanceKm: 1.3 },
      { nodeId: "vienna_1150", minutes: 9, distanceKm: 2.5 }
    ]
  },
  vienna_1070: {
    id: "vienna_1070",
    label: "1070 — Neubau",
    lat: 48.2058,
    lng: 16.3497,
    neighbors: [
      { nodeId: "clinic_innere_stadt", minutes: 14, distanceKm: 3.4 },
      { nodeId: "clinic_mariahilf", minutes: 6, distanceKm: 1.2 },
      { nodeId: "vienna_1060", minutes: 6, distanceKm: 1.3 }
    ]
  },
  vienna_1100: {
    id: "vienna_1100",
    label: "1100 — Favoriten",
    lat: 48.1536,
    lng: 16.382,
    neighbors: [
      { nodeId: "clinic_innere_stadt", minutes: 22, distanceKm: 6.8 },
      { nodeId: "vienna_1230", minutes: 18, distanceKm: 5.4 },
      { nodeId: "wr_neustadt", minutes: 78, distanceKm: 55 }
    ]
  },
  vienna_1150: {
    id: "vienna_1150",
    label: "1150 — Rudolfsheim-Fünfhaus",
    lat: 48.1968,
    lng: 16.3308,
    neighbors: [
      { nodeId: "clinic_mariahilf", minutes: 11, distanceKm: 2.9 },
      { nodeId: "vienna_1060", minutes: 9, distanceKm: 2.5 },
      { nodeId: "vienna_1140", minutes: 8, distanceKm: 2.6 }
    ]
  },
  vienna_1140: {
    id: "vienna_1140",
    label: "1140 — Penzing",
    lat: 48.2099,
    lng: 16.2786,
    neighbors: [
      { nodeId: "vienna_1150", minutes: 8, distanceKm: 2.6 },
      { nodeId: "vienna_1130", minutes: 10, distanceKm: 3.2 }
    ]
  },
  vienna_1130: {
    id: "vienna_1130",
    label: "1130 — Hietzing",
    lat: 48.1849,
    lng: 16.3098,
    neighbors: [
      { nodeId: "vienna_1140", minutes: 10, distanceKm: 3.2 },
      { nodeId: "vienna_1150", minutes: 11, distanceKm: 3.5 }
    ]
  },
  vienna_1190: {
    id: "vienna_1190",
    label: "1190 — Döbling",
    lat: 48.2541,
    lng: 16.3525,
    neighbors: [
      { nodeId: "clinic_innere_stadt", minutes: 24, distanceKm: 7.2 },
      { nodeId: "vienna_1180", minutes: 11, distanceKm: 3.1 }
    ]
  },
  vienna_1180: {
    id: "vienna_1180",
    label: "1180 — Währing",
    lat: 48.2329,
    lng: 16.3357,
    neighbors: [
      { nodeId: "vienna_1190", minutes: 11, distanceKm: 3.1 }
    ]
  },
  vienna_1220: {
    id: "vienna_1220",
    label: "1220 — Donaustadt",
    lat: 48.2228,
    lng: 16.4575,
    neighbors: [
      { nodeId: "vienna_1020", minutes: 18, distanceKm: 5.6 }
    ]
  },
  vienna_1230: {
    id: "vienna_1230",
    label: "1230 — Liesing",
    lat: 48.1361,
    lng: 16.2925,
    neighbors: [
      { nodeId: "vienna_1100", minutes: 18, distanceKm: 5.4 }
    ]
  },
  wr_neustadt: {
    id: "wr_neustadt",
    label: "Wiener Neustadt",
    lat: 47.815,
    lng: 16.2465,
    neighbors: [
      { nodeId: "vienna_1100", minutes: 78, distanceKm: 55 }
    ]
  }
};

function haversineKm(a: RouteNode, b: RouteNode): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sLat1 = Math.sin(dLat / 2);
  const sLng1 = Math.sin(dLng / 2);
  const h =
    sLat1 * sLat1 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      sLng1 *
      sLng1;
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function heuristicMinutes(a: RouteNode, b: RouteNode): number {
  const distanceKm = haversineKm(a, b);
  const assumedSpeedKmH = 45;
  return (distanceKm / assumedSpeedKmH) * 60;
}

export interface RouteEstimate {
  minutes: number;
  distanceKm: number;
  path: string[];
  found: boolean;
}

export function estimateRouteMinutes(params: {
  fromNodeId?: string;
  toNodeId?: string;
}): RouteEstimate {
  const start = params.fromNodeId ? routeGraph[params.fromNodeId] : undefined;
  const goal = params.toNodeId ? routeGraph[params.toNodeId] : undefined;

  if (!start || !goal) {
    // Unknown nodes: treat as feasible with zero travel (best-effort fallback).
    return { minutes: 0, distanceKm: 0, path: [], found: false };
  }

  if (start.id === goal.id) {
    return { minutes: 0, distanceKm: 0, path: [start.id], found: true };
  }

  const openSet = new Set<string>([start.id]);
  const cameFrom: Record<string, string> = {};
  const gScore: Record<string, number> = {};
  const fScore: Record<string, number> = {};
  for (const id of Object.keys(routeGraph)) {
    gScore[id] = Infinity;
    fScore[id] = Infinity;
  }
  gScore[start.id] = 0;
  fScore[start.id] = heuristicMinutes(start, goal);

  while (openSet.size > 0) {
    let currentId: string | undefined;
    let lowest = Infinity;
    openSet.forEach((id) => {
      if (fScore[id] < lowest) {
        lowest = fScore[id];
        currentId = id;
      }
    });
    if (!currentId) break;

    if (currentId === goal.id) {
      const path = reconstructPath(cameFrom, currentId);
      return {
        minutes: Math.round(gScore[currentId]),
        distanceKm: Math.round(pathDistanceKm(path) * 10) / 10,
        path,
        found: true
      };
    }

    openSet.delete(currentId);
    const current = routeGraph[currentId];
    for (const edge of current.neighbors) {
      const tentativeG = gScore[currentId] + edge.minutes;
      if (tentativeG < gScore[edge.nodeId]) {
        cameFrom[edge.nodeId] = currentId;
        gScore[edge.nodeId] = tentativeG;
        fScore[edge.nodeId] = tentativeG + heuristicMinutes(routeGraph[edge.nodeId], goal);
        openSet.add(edge.nodeId);
      }
    }
  }

  return { minutes: Infinity, distanceKm: Infinity, path: [], found: false };
}

function reconstructPath(cameFrom: Record<string, string>, current: string): string[] {
  const path = [current];
  while (cameFrom[current]) {
    current = cameFrom[current];
    path.unshift(current);
  }
  return path;
}

function pathDistanceKm(path: string[]): number {
  let total = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const current = routeGraph[path[i]];
    const edge = current?.neighbors.find((n) => n.nodeId === path[i + 1]);
    total += edge?.distanceKm ?? 0;
  }
  return total;
}

export function travelFeasibility(params: {
  travelMinutes: number;
  arrivalBufferMinutes: number;
  timeLeftMinutes: number;
}): { feasible: boolean; score: number } {
  const { travelMinutes, arrivalBufferMinutes, timeLeftMinutes } = params;
  const required = travelMinutes + arrivalBufferMinutes;
  if (timeLeftMinutes <= 0) return { feasible: false, score: 0 };
  if (required > timeLeftMinutes) return { feasible: false, score: 0 };
  const slack = timeLeftMinutes - required;
  const score = Math.max(0, Math.min(1, slack / Math.max(1, timeLeftMinutes)));
  return { feasible: true, score };
}

export function listRouteNodes(): { id: string; label: string }[] {
  return Object.values(routeGraph).map((n) => ({ id: n.id, label: n.label }));
}
