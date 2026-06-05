import { FC } from "react";
import { motion } from "framer-motion";
import { HelpCategory } from "../help_center.utils";

interface HelpCategoriesProps {
  categories: HelpCategory[];
}

const HelpCategories: FC<HelpCategoriesProps> = ({ categories }) => {
  return (
    <motion.section
      id="help-categories"
      className="scroll-mt-28 transition-colors duration-300 w-full"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5 }}
      aria-labelledby="categories-heading"
    >
      <div className="mb-10 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-300 mb-4">
          <i className="fa-solid fa-layer-group"></i>
          <span className="text-sm font-semibold">
            HELP CATEGORIES
          </span>
        </div>

        <h2
          id="categories-heading"
          className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white mb-4"
        >
          Explore by Category
        </h2>

        <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Browse support topics designed to help you quickly understand
          StorySparkAI features, workflows, and troubleshooting steps.
        </p>
      </div>

      {!categories || categories.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 dark:border-white/10 bg-slate-100 dark:bg-white/[0.03] p-12 text-center">
          <div className="w-20 h-20 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center mx-auto mb-5">
            <i className="fa-solid fa-magnifying-glass text-3xl text-slate-500"></i>
          </div>

          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
            No Categories Found
          </h3>

          <p className="text-slate-600 dark:text-slate-400">
            Try adjusting your search keywords.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {categories.map((category, index) => (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{
                duration: 0.45,
                delay: Math.min(index * 0.08, 0.3),
              }}
              whileHover={{ y: -6 }}
              className="
                group relative overflow-hidden
                rounded-3xl
                border border-slate-200 dark:border-white/10
                bg-white dark:bg-[#111827]/40
                backdrop-blur-xl
                hover:border-blue-500/40
                transition-all duration-300
                shadow-sm hover:shadow-xl
                p-7
              "
            >
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-blue-500/20 flex items-center justify-center text-2xl text-blue-600 dark:text-blue-300 mb-6 group-hover:scale-110 transition-transform duration-300">
                <i className={category.icon}></i>
              </div>

              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3 group-hover:text-blue-500 dark:group-hover:text-blue-300 transition-colors">
                {category.title}
              </h3>

              <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm">
                {category.description}
              </p>

              <div className="mt-6 flex items-center justify-between">
                <span className="text-blue-600 dark:text-blue-300 text-sm font-semibold">
                  Learn More
                </span>

                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-400 group-hover:text-white group-hover:bg-blue-500/20 transition-all duration-300">
                  <i className="fa-solid fa-arrow-right"></i>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.section>
  );
};

export default HelpCategories;