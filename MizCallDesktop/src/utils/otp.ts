export const handleOtpDigitChange = (
  index: number,
  value: string,
  setter: React.Dispatch<React.SetStateAction<string[]>>,
  refs: React.MutableRefObject<Array<HTMLInputElement | null>>
) => {
  const v = value.replace(/\D/g, "").slice(0, 1);
  setter((prev) => {
    const next = [...prev];
    next[index] = v;
    return next;
  });
  if (v && refs.current[index + 1]) {
    refs.current[index + 1]?.focus();
  }
};

export const handleOtpKeyDown = (
  e: React.KeyboardEvent<HTMLInputElement>,
  index: number,
  values: string[],
  setter: React.Dispatch<React.SetStateAction<string[]>>,
  refs: React.MutableRefObject<Array<HTMLInputElement | null>>
) => {
  if (e.key === "Backspace" && !values[index] && refs.current[index - 1]) {
    setter((prev) => {
      const next = [...prev];
      next[index - 1] = "";
      return next;
    });
    refs.current[index - 1]?.focus();
  }
};

export const handleOtpPaste = (
  e: React.ClipboardEvent<HTMLInputElement>,
  setter: React.Dispatch<React.SetStateAction<string[]>>,
  refs: React.MutableRefObject<Array<HTMLInputElement | null>>
) => {
  e.preventDefault();
  const pastedData = e.clipboardData.getData("text");
  const digits = pastedData.replace(/\D/g, "").slice(0, 6).split("");
  setter(digits.concat(Array(6 - digits.length).fill("")));
  const nextEmpty = digits.length < 6 ? digits.length : 5;
  refs.current[nextEmpty]?.focus();
};
