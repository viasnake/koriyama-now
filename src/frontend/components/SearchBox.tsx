import { Search } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

type SearchBoxProps = {
  defaultValue?: string;
  placeholder?: string;
  onSearch: (query: string) => void;
};

export function SearchBox({ defaultValue = "", placeholder = "キーワードで探す", onSearch }: SearchBoxProps) {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    setValue(defaultValue);
  }, [defaultValue]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSearch(value.trim());
  };

  return (
    <form className="search-box" onSubmit={handleSubmit} role="search">
      <label className="sr-only" htmlFor="site-search">
        検索
      </label>
      <Search aria-hidden="true" size={21} />
      <input
        id="site-search"
        type="search"
        name="q"
        value={value}
        onChange={(event) => setValue(event.currentTarget.value)}
        placeholder={placeholder}
        inputMode="search"
        enterKeyHint="search"
        autoComplete="off"
      />
      <button type="submit">検索</button>
    </form>
  );
}
