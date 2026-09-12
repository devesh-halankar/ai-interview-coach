"use client";

import { useState } from "react";
import SetupScreen, { StartedInterview } from "@/components/SetupScreen";
import InterviewScreen from "@/components/InterviewScreen";
import ReportScreen from "@/components/ReportScreen";
import type { Message } from "@/lib/api";

type Phase =
  | { screen: "setup" }
  | { screen: "interview"; session: StartedInterview }
  | { screen: "report"; session: StartedInterview; history: Message[] };

export default function Home() {
  const [phase, setPhase] = useState<Phase>({ screen: "setup" });

  switch (phase.screen) {
    case "interview":
      return (
        <InterviewScreen
          topic={phase.session.topic}
          difficulty={phase.session.difficulty}
          firstMessage={phase.session.firstMessage}
          onEnded={(history) =>
            setPhase({ screen: "report", session: phase.session, history })
          }
        />
      );
    case "report":
      return (
        <ReportScreen
          topic={phase.session.topic}
          difficulty={phase.session.difficulty}
          history={phase.history}
          onRestart={() => setPhase({ screen: "setup" })}
        />
      );
    default:
      return (
        <SetupScreen
          onStart={(session) => setPhase({ screen: "interview", session })}
        />
      );
  }
}
