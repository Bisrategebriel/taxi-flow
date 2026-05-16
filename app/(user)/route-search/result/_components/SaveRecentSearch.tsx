"use client";
// FR-RS-07
import { useEffect } from "react";
import { useRecentSearches } from "@/hooks/useRecentSearches";

interface Props {
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
}

export default function SaveRecentSearch({ fromId, fromName, toId, toName }: Props) {
  const { add } = useRecentSearches();
  useEffect(() => {
    add({ fromId, fromName, toId, toName });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
