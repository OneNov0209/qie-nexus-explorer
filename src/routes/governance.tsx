import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { cosmos, formatQIE, shorten } from "@/lib/api";
import { Card, SectionTitle, Loading, ErrorState, Pill, StatCard } from "@/components/ui/primitives";
import { NETWORK } from "@/data/network";
import { toast } from "sonner";
import { useWallet } from "@/lib/wallet";
import { voteProposal } from "@/lib/wallet-tx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useState } from "react";
import { Loader2, FileText, CheckCircle, XCircle, Clock, AlertTriangle, Users, ChevronRight, Vote } from "lucide-react";
import dayjs from "dayjs";

export const Route = createFileRoute("/governance")({
  component: GovernanceLayout,
});

function GovernanceLayout() {
  return <Outlet />;
}
