"use client";

import { AnimatePresence, motion } from "motion/react";
import { useSimStore } from "@/store/simStore";
import BrandLogo from "./three/BrandLogo";
import { TOPICS } from "./types";

export default function TopicPicker() {
  const open = useSimStore((s) => s.pickerOpen);
  const setPicker = useSimStore((s) => s.setPicker);
  const setMission = useSimStore((s) => s.setMission);
  const sqlOpen = useSimStore((s) => s.sqlOpen);
  const toggleSql = useSimStore((s) => s.toggleSql);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="absolute inset-0 z-50 flex items-center justify-center bg-bg/80 p-6 backdrop-blur-md"
        >
          <div className="w-full max-w-2xl">
            <div className="flex items-baseline justify-between">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-accent">Interactive playground</p>
                <h2 className="mt-1 text-xl font-semibold md:text-2xl">What do you want to learn?</h2>
              </div>
              <button
                onClick={() => setPicker(false)}
                className="cursor-pointer font-mono text-xs uppercase tracking-widest text-foreground-muted hover:text-foreground"
              >
                skip ✕
              </button>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {TOPICS.map((topic, i) => (
                <motion.button
                  key={topic.key}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * i, duration: 0.3, ease: "easeOut" }}
                  onClick={() => {
                    if (topic.mission) setMission(topic.mission);
                    if (topic.sql && !sqlOpen) toggleSql();
                    setPicker(false);
                  }}
                  className="node-3d group cursor-pointer rounded-xl border border-border p-4 text-left transition-colors hover:border-accent/50"
                >
                  <span className="flex items-center gap-2">
                    <BrandLogo name={topic.brand} size={20} />
                    <span className="inline-block rounded border border-accent/40 bg-accent/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-accent">
                      {topic.tag}
                    </span>
                  </span>
                  <h3 className="mt-2 text-sm font-semibold group-hover:text-accent">{topic.title}</h3>
                  <p className="mt-1 text-xs text-foreground-muted">{topic.desc}</p>
                </motion.button>
              ))}
            </div>

            <p className="mt-5 text-center font-mono text-[10px] uppercase tracking-widest text-foreground-muted">
              or follow the guided tour, mission 01 → 07
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
