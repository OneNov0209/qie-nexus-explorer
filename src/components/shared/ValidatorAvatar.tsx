import { useQuery } from "@tanstack/react-query";

export function ValidatorAvatar({ identity, moniker, size }: { identity?: string; moniker?: string; size?: "sm" | "md" | "lg" }) {
  const { data: avatarUrl } = useQuery({
    queryKey: ["keybase-avatar", identity],
    queryFn: async () => {
      if (!identity) return null;
      try {
        const res = await fetch(`https://keybase.io/_/api/1.0/user/lookup.json?key_suffix=${identity}&fields=pictures`);
        const data = await res.json();
        return data?.them?.[0]?.pictures?.primary?.url || null;
      } catch {
        return null;
      }
    },
    staleTime: 24 * 60 * 60_000,
    enabled: !!identity,
  });

  const initials = (moniker || "??").slice(0, 2).toUpperCase();
  const sizeClass = size === "lg" ? "w-12 h-12 text-base" : size === "sm" ? "w-7 h-7 text-[10px]" : "w-9 h-9 text-xs";

  return (
    <div className={`${sizeClass} rounded-full bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 grid place-items-center shrink-0 overflow-hidden`}>
      {avatarUrl ? (
        <img src={avatarUrl} alt={moniker || ""} className="w-full h-full object-cover" />
      ) : (
        <span className="font-bold text-violet-400">{initials}</span>
      )}
    </div>
  );
}
