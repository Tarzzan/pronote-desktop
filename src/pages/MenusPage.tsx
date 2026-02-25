import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, UtensilsCrossed } from 'lucide-react';
import { addDays, addWeeks, format, startOfWeek, subWeeks } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getClient } from '../lib/pronote/client';
import type { MenuEntry } from '../types/pronote';

type FoodLabel = {
  name: string;
  color: string | null;
};

type Food = {
  name: string;
  labels: FoodLabel[];
};

type MenuSection = {
  title: string;
  foods: Food[];
};

type NormalizedMenu = {
  id: string;
  date: Date;
  mealLabel: string;
  name: string | null;
  sections: MenuSection[];
};

const SECTION_DEFINITIONS: Array<{ key: string; title: string }> = [
  { key: 'first_meal', title: 'Entrée' },
  { key: 'main_meal', title: 'Plat principal' },
  { key: 'side_meal', title: 'Accompagnement' },
  { key: 'other_meal', title: 'Complément' },
  { key: 'cheese', title: 'Fromage' },
  { key: 'dessert', title: 'Dessert' },
];

const toRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
};

const toStringValue = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const toBooleanValue = (value: unknown): boolean | null => {
  if (typeof value === 'boolean') return value;
  return null;
};

const toArrayValue = (value: unknown): unknown[] => {
  return Array.isArray(value) ? value : [];
};

const parseMenuDate = (value: unknown): Date | null => {
  const stringValue = toStringValue(value);
  if (stringValue) {
    const plainDateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(stringValue);
    if (plainDateMatch) {
      const [, y, m, d] = plainDateMatch;
      return new Date(Number(y), Number(m) - 1, Number(d), 12, 0, 0);
    }
    const parsed = new Date(stringValue);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  if (typeof value === 'number') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return null;
};

const normalizeLabels = (value: unknown): FoodLabel[] => {
  return toArrayValue(value)
    .map((entry) => {
      const record = toRecord(entry);
      if (!record) return null;
      const name =
        toStringValue(record.name) ??
        toStringValue(record.L) ??
        toStringValue(record.label) ??
        toStringValue(record.value);
      if (!name) return null;
      const color = toStringValue(record.color) ?? toStringValue(record.couleur);
      return { name, color };
    })
    .filter((label): label is FoodLabel => Boolean(label));
};

const normalizeFood = (value: unknown): Food | null => {
  const directName = toStringValue(value);
  if (directName) {
    return { name: directName, labels: [] };
  }

  const record = toRecord(value);
  if (!record) return null;

  const name =
    toStringValue(record.name) ??
    toStringValue(record.L) ??
    toStringValue(record.label) ??
    toStringValue(record.title) ??
    toStringValue(record.value);
  if (!name) return null;

  const labels = normalizeLabels(record.labels ?? record.listeLabelsAlimentaires);
  return { name, labels };
};

const normalizeMenu = (entry: MenuEntry, index: number): NormalizedMenu | null => {
  const record = toRecord(entry);
  if (!record) return null;

  const date = parseMenuDate(record.date ?? record.Date ?? record.day ?? record.jour);
  if (!date) return null;

  const sections = SECTION_DEFINITIONS.map(({ key, title }) => {
    const foods = toArrayValue(record[key])
      .map(normalizeFood)
      .filter((food): food is Food => Boolean(food));
    return { title, foods };
  }).filter((section) => section.foods.length > 0);

  if (sections.length === 0) {
    const fallbackFoods = toArrayValue(record.foods)
      .map(normalizeFood)
      .filter((food): food is Food => Boolean(food));
    if (fallbackFoods.length > 0) {
      sections.push({ title: 'Menu', foods: fallbackFoods });
    }
  }

  const id = toStringValue(record.id) ?? `${format(date, 'yyyy-MM-dd')}-${index}`;
  const isLunch = toBooleanValue(record.is_lunch);
  const isDinner = toBooleanValue(record.is_dinner);
  const mealLabel = isLunch ? 'Déjeuner' : isDinner ? 'Dîner' : 'Repas';
  const name = toStringValue(record.name) ?? toStringValue(record.L);

  return { id, date, mealLabel, name, sections };
};

const MenusPage: React.FC = () => {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [menus, setMenus] = useState<NormalizedMenu[]>([]);
  const [loading, setLoading] = useState(true);
  const weekStart = useMemo(() => startOfWeek(currentWeek, { weekStartsOn: 1 }), [currentWeek]);

  useEffect(() => {
    let cancelled = false;

    const loadMenus = async () => {
      const client = getClient();
      if (!client) {
        setMenus([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const rawMenus = await client.getMenus(weekStart, addDays(weekStart, 6));
        const normalized = rawMenus
          .map((entry, index) => normalizeMenu(entry, index))
          .filter((menu): menu is NormalizedMenu => Boolean(menu))
          .sort((a, b) => a.date.getTime() - b.date.getTime());
        if (!cancelled) setMenus(normalized);
      } catch (error) {
        console.error('[MenusPage] Erreur de chargement des menus:', error);
        if (!cancelled) setMenus([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadMenus();
    return () => {
      cancelled = true;
    };
  }, [weekStart]);

  const menusByDay = useMemo(() => {
    const grouped: Record<string, NormalizedMenu[]> = {};
    for (const menu of menus) {
      const key = format(menu.date, 'yyyy-MM-dd');
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(menu);
    }
    return grouped;
  }, [menus]);

  const sortedDays = useMemo(() => Object.keys(menusByDay).sort(), [menusByDay]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Menus</h1>
          <p className="text-sm text-gray-500 mt-1">
            Semaine du {format(weekStart, 'd MMM', { locale: fr })} au {format(addDays(weekStart, 6), 'd MMM yyyy', { locale: fr })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            aria-label="Semaine précédente"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <button
            onClick={() => setCurrentWeek(new Date())}
            className="px-4 py-2 text-sm font-medium bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors"
          >
            Aujourd&apos;hui
          </button>
          <button
            onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            aria-label="Semaine suivante"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-10 h-10 border-4 border-blue-700 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : sortedDays.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-10 text-center text-gray-500">
          <UtensilsCrossed className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Aucun menu disponible sur cette période.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedDays.map((dayKey) => {
            const dayMenus = menusByDay[dayKey];
            const dayDate = parseMenuDate(dayKey);
            return (
              <section key={dayKey} className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 space-y-3">
                <div className="flex items-center justify-between gap-2 border-b border-gray-100 pb-2">
                  <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                    {dayDate ? format(dayDate, 'EEEE d MMMM yyyy', { locale: fr }) : dayKey}
                  </h2>
                  <span className="text-xs text-gray-500">{dayMenus.length} menu(x)</span>
                </div>

                <div className="space-y-3">
                  {dayMenus.map((menu, menuIndex) => (
                    <article key={`${menu.id}-${menuIndex}`} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-semibold text-gray-900">{menu.name || menu.mealLabel}</div>
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                          {menu.mealLabel}
                        </span>
                      </div>

                      {menu.sections.length === 0 ? (
                        <p className="text-sm text-gray-500 mt-2">Aucun détail de menu fourni.</p>
                      ) : (
                        <div className="mt-3 grid gap-2 md:grid-cols-2">
                          {menu.sections.map((section, sectionIndex) => (
                            <div key={`${menu.id}-${section.title}-${sectionIndex}`} className="bg-white border border-gray-100 rounded-md p-2.5">
                              <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
                                {section.title}
                              </div>
                              <ul className="space-y-1">
                                {section.foods.map((food, foodIndex) => (
                                  <li key={`${menu.id}-${section.title}-${food.name}-${foodIndex}`} className="text-sm text-gray-800">
                                    <div className="font-medium">{food.name}</div>
                                    {food.labels.length > 0 && (
                                      <div className="mt-1 flex flex-wrap gap-1">
                                        {food.labels.map((label, labelIndex) => (
                                          <span
                                            key={`${food.name}-${label.name}-${labelIndex}`}
                                            className="inline-flex items-center px-1.5 py-0.5 rounded border text-xs font-medium"
                                            style={{
                                              borderColor: label.color ?? '#d1d5db',
                                              color: label.color ?? '#6b7280',
                                            }}
                                          >
                                            {label.name}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MenusPage;
