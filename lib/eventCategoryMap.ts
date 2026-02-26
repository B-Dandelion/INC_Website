export function adminSlugToEventCategory(slug: string) {
  switch (slug) {
    case "essay-contest":
      return { category: "essay_contest" as const };
    case "shortform-contest":
      return { category: "shortform_contest" as const };
    case "seminar":
      return { category: "seminar" as const };
    case "workshop":
      return { category: "workshop" as const };
    case "midterm-report":
      // project_report 중 midterm
      return { category: "project_report" as const, subtypeDefault: "midterm" as const };
    default:
      return null;
  }
}
