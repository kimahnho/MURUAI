interface TabItem<T extends string> {
  id: T;
  label: string;
}

interface TabsProps<T extends string> {
  items: TabItem<T>[];
  activeId: T;
  onTabChange: (id: T) => void;
  fullWidth?: boolean;
}

const Tabs = <T extends string>({
  items,
  activeId,
  onTabChange,
  fullWidth = true,
}: TabsProps<T>) => {
  return (
    <div className="flex border-b border-black-25">
      {items.map((item) => {
        const isActive = item.id === activeId;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onTabChange(item.id)}
            className={`pb-2.5 pt-1 text-14-semibold transition-colors cursor-pointer ${
              fullWidth ? "flex-1" : "px-4"
            } ${
              isActive
                ? "border-b-2 border-primary text-primary"
                : "border-b-2 border-transparent text-black-50 hover:text-black-90"
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
};

export default Tabs;
