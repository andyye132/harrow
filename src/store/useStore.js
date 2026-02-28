import { create } from 'zustand';

const useStore = create((set) => ({
  // Theme
  theme: 'light',
  toggleTheme: () => set((state) => {
    const newTheme = state.theme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    return { theme: newTheme };
  }),

  // Map interaction
  selectedState: null,
  hoveredState: null,
  selectedMonth: new Date().getMonth(),
  selectedYear: 2024,
  pointerPosition: { x: 0, y: 0 },
  drillDownState: null,

  // Chat drawer
  chatOpen: false,
  toggleChat: () => set((state) => ({ chatOpen: !state.chatOpen })),
  setChatOpen: (open) => set({ chatOpen: open }),

  // Plant helper
  helperState: null,
  helperCrop: null,
  helperPlantDate: null,
  claudeResponse: null,
  claudeLoading: false,

  // Chart filters
  chartCrop: 'corn',
  chartState: null,
  chartYearRange: [2010, 2024],

  // Data (loaded once)
  stateYields: null,
  countyYields: null,
  anomalies: null,
  stateSummaries: null,
  plantingGuide: null,
  extremeEvents: null,
  monthlyNormals: null,
  weatherByState: null,
  weatherAnomalies: null,

  // Actions
  setSelectedState: (id) => set((state) => ({
    selectedState: state.selectedState === id ? null : id,
    helperState: state.selectedState === id ? state.helperState : id,
    drillDownState: null,
  })),
  setDrillDownState: (id) => set({ drillDownState: id }),
  setHoveredState: (id) => set({ hoveredState: id }),
  setPointerPosition: (pos) => set({ pointerPosition: pos }),
  setSelectedMonth: (month) => set({ selectedMonth: month }),
  setSelectedYear: (year) => set({ selectedYear: year }),

  setHelperState: (s) => set({ helperState: s }),
  setHelperCrop: (c) => set({ helperCrop: c }),
  setHelperPlantDate: (d) => set({ helperPlantDate: d }),
  setClaudeResponse: (r) => set({ claudeResponse: r }),
  setClaudeLoading: (l) => set({ claudeLoading: l }),

  setChartCrop: (c) => set({ chartCrop: c }),
  setChartState: (s) => set({ chartState: s }),
  setChartYearRange: (r) => set({ chartYearRange: r }),

  setData: (key, data) => set({ [key]: data }),
}));

export default useStore;
