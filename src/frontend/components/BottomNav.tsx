import { Home, Map, Newspaper, Search } from "lucide-react";
import { NavLink } from "react-router-dom";

const items = [
  { to: "/", label: "ホーム", icon: Home },
  { to: "/search", label: "探す", icon: Search },
  { to: "/map", label: "地図", icon: Map },
  { to: "/news", label: "お知らせ", icon: Newspaper }
] as const;

export function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="主要ナビゲーション">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) => `bottom-nav__item${isActive ? " is-active" : ""}`}
          >
            <Icon aria-hidden="true" size={21} strokeWidth={2.2} />
            <span>{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
