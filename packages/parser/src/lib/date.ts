const DATE_TIME_RE =
  /^(\d{4}-\d{2}-\d{2})?[T ]?(?:(\d{2}):\d{2}(?::\d{2}(?:\.\d+)?)?)?(Z|[-+]\d{2}:\d{2})?$/i;

class TomlDate extends Date {
  #hasDate = false;
  #hasTime = false;
  #offset: string | null = null;

  constructor(date: string | Date) {
    let hasDate = true;
    let hasTime = true;
    let offset: string | null = "Z";

    if (typeof date === "string") {
      let match = date.match(DATE_TIME_RE);
      if (match) {
        if (!match[1]) {
          hasDate = false;
          date = `0000-01-01T${date}`;
        }

        hasTime = !!match[2];

        // Make sure to use T instead of a space. Breaks in case of extreme values otherwise.
        if (hasTime && date[10] === " ") {
          date = date.replace(" ", "T");
        }

        // Do not allow rollover hours.
        if (match[2] && +match[2] > 23) {
          date = "";
        } else {
          offset = match[3] || null;
          date = date.toUpperCase();
          if (!offset && hasTime) date += "Z";
        }
      } else {
        date = "";
      }
    }

    super(date);

    if (!isNaN(this.getTime())) {
      this.#hasDate = hasDate;
      this.#hasTime = hasTime;
      this.#offset = offset;
    }
  }

  isDateTime(): boolean {
    return this.#hasDate && this.#hasTime;
  }

  isLocal(): boolean {
    return !this.#hasDate || !this.#hasTime || !this.#offset;
  }

  isDate(): boolean {
    return this.#hasDate && !this.#hasTime;
  }

  isTime(): boolean {
    return this.#hasTime && !this.#hasDate;
  }

  isValid(): boolean {
    return this.#hasDate || this.#hasTime;
  }

  override toISOString(): string {
    const iso = super.toISOString();

    // Local Date
    if (this.isDate()) return iso.slice(0, 10);

    // Local Time
    if (this.isTime()) return iso.slice(11, 23);

    // Local DateTime
    if (this.#offset === null) return iso.slice(0, -1);

    // Offset DateTime
    if (this.#offset === "Z") return iso;

    // This part is quite annoying: JS strips the original timezone from the ISO string representation
    // Instead of using a "modified" date and "Z", we restore the representation "as authored"

    let offset = +this.#offset.slice(1, 3) * 60 + +this.#offset.slice(4, 6);
    offset = this.#offset[0] === "-" ? offset : -offset;

    const offsetDate = new Date(this.getTime() - offset * 60e3);
    return offsetDate.toISOString().slice(0, -1) + this.#offset;
  }

  static wrapAsOffsetDateTime(jsDate: Date, offset = "Z"): TomlDate {
    const date = new TomlDate(jsDate);
    date.#offset = offset;
    return date;
  }

  static wrapAsLocalDateTime(jsDate: Date): TomlDate {
    const n = new TomlDate(jsDate);
    n.#offset = null;
    return n;
  }

  static wrapAsLocalDate(jsDate: Date): TomlDate {
    let n = new TomlDate(jsDate);
    return ((n.#hasTime = false), (n.#offset = null), n);
  }

  static wrapAsLocalTime(jsDate: Date): TomlDate {
    let n = new TomlDate(jsDate);
    return ((n.#hasDate = false), (n.#offset = null), n);
  }
}

export { TomlDate };
