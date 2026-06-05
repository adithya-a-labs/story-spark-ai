import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";
import { SubmitHandler, useForm } from "react-hook-form";

import StoriesViewComponent, { IStories } from "./stories.view.component";
import RecentPromptsPanel from "./RecentPromptsPanel";
import { getUserInfo, isLoggedIn } from "../../services/auth.service";
import { getRequestLimit, getWordCount, prompts } from "./stories.utils";
import {
  useGenerateFreeModelMutation,
  useGenerateModelMutation,
} from "../../redux/apis/ai.model.api";
import { useGetProfileInfoQuery } from "../../redux/apis/user.api";
import { getErrorMessage } from "../../error/error.message";
import useKeyboardShortcuts from "../../hooks/useKeyboardShortcuts";
import { useRecentPrompts } from "../../hooks/useRecentPrompts";
import { useDebounce } from "../../hooks/useDebounce";
import StoryGeneratingAnimation from "../loading/story-generating-animation.component";

type Inputs = {
  prompt: string;
};

const MAX_PROMPT_LENGTH = 2000;
const WARN_THRESHOLD = 0.85;
const STORIES_PER_PAGE = 10;
const LANGUAGE_STORAGE_KEY = "storySparkLanguage";
const DRAFT_KEY = "story_spark_draft";
const PROMPT_DRAFT_KEY = "storyspark_story_draft_v1";

const DEFAULT_STORIES: IStories[] = [
  {
    uuid: "test-1",
    title: "The Wizard's Journey",
    content:
      "Merlin walked through the forest toward the castle. The village was far behind him. He crossed the bridge over the river and entered the dungeon beneath the tower. Dragons guarded the mountain beyond the valley. Elena watched from the palace window as Merlin approached the cave near the ocean shore.",
    tag: "Fantasy",
    imageURL: "https://via.placeholder.com/400x300",
  },
];

const soundtrackMap: Record<string, string> = {
  "🧙 Fantasy": "/audio/fantasy.mp3",
  "😱 Horror": "/audio/horror.mp3",
  "💕 Romance": "/audio/romance.mp3",
  "🎭 Drama": "/audio/drama.mp3",
  "😂 Comedy": "/audio/comedy.mp3",
  "🚀 Sci-Fi": "/audio/sci-fi.mp3",
  "🔍 Mystery": "/audio/mystery.mp3",
  "🌟 Adventure": "/audio/adventure.mp3",
};

const LANGUAGES = [
  { code: "en", name: "English" },
  { code: "hi", name: "Hindi" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "pt", name: "Portuguese" },
  { code: "de", name: "German" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
  { code: "bn", name: "Bengali" },
  { code: "ta", name: "Tamil" },
  { code: "te", name: "Telugu" },
  { code: "mr", name: "Marathi" },
] as const;

const GENRES = [
  { value: "🎭 Drama", icon: "🎭", name: "Drama" },
  { value: "😂 Comedy", icon: "😂", name: "Comedy" },
  { value: "😱 Horror", icon: "😱", name: "Horror" },
  { value: "💕 Romance", icon: "💕", name: "Romance" },
  { value: "🚀 Sci-Fi", icon: "🚀", name: "Sci-Fi" },
  { value: "🧙 Fantasy", icon: "🧙", name: "Fantasy" },
  { value: "🔍 Mystery", icon: "🔍", name: "Mystery" },
  { value: "🌟 Adventure", icon: "🌟", name: "Adventure" },
] as const;

type GenreName = (typeof GENRES)[number]["name"];

const GENRE_LABELS: Record<string, Record<GenreName, string>> = {
  English: {
    Drama: "Drama",
    Comedy: "Comedy",
    Horror: "Horror",
    Romance: "Romance",
    "Sci-Fi": "Sci-Fi",
    Fantasy: "Fantasy",
    Mystery: "Mystery",
    Adventure: "Adventure",
  },
  Spanish: {
    Drama: "Drama",
    Comedy: "Comedia",
    Horror: "Terror",
    Romance: "Romance",
    "Sci-Fi": "Ciencia ficción",
    Fantasy: "Fantasía",
    Mystery: "Misterio",
    Adventure: "Aventura",
  },
  French: {
    Drama: "Drame",
    Comedy: "Comédie",
    Horror: "Horreur",
    Romance: "Romance",
    "Sci-Fi": "Science-fiction",
    Fantasy: "Fantastique",
    Mystery: "Mystère",
    Adventure: "Aventure",
  },
  Portuguese: {
    Drama: "Drama",
    Comedy: "Comédia",
    Horror: "Terror",
    Romance: "Romance",
    "Sci-Fi": "Ficção científica",
    Fantasy: "Fantasia",
    Mystery: "Mistério",
    Adventure: "Aventura",
  },
  Hindi: {
    Drama: "नाटक",
    Comedy: "हास्य",
    Horror: "डरावनी",
    Romance: "प्रेम",
    "Sci-Fi": "विज्ञान कथा",
    Fantasy: "कल्पना",
    Mystery: "रहस्य",
    Adventure: "रोमांच",
  },
  German: {
    Drama: "Drama",
    Comedy: "Komödie",
    Horror: "Horror",
    Romance: "Romanze",
    "Sci-Fi": "Science-Fiction",
    Fantasy: "Fantasy",
    Mystery: "Mystery",
    Adventure: "Abenteuer",
  },
  Japanese: {
    Drama: "ドラマ",
    Comedy: "コメディ",
    Horror: "ホラー",
    Romance: "ロマンス",
    "Sci-Fi": "SF",
    Fantasy: "ファンタジー",
    Mystery: "ミステリー",
    Adventure: "冒険",
  },
  Korean: {
    Drama: "드라마",
    Comedy: "코미디",
    Horror: "공포",
    Romance: "로맨스",
    "Sci-Fi": "SF",
    Fantasy: "판타지",
    Mystery: "미스터리",
    Adventure: "모험",
  },
  Bengali: {
    Drama: "নাটক",
    Comedy: "কৌতুক",
    Horror: "ভৌতিক",
    Romance: "প্রেম",
    "Sci-Fi": "বিজ্ঞান কল্পকাহিনি",
    Fantasy: "কল্পনা",
    Mystery: "রহস্য",
    Adventure: "অভিযান",
  },
  Tamil: {
    Drama: "நாடகம்",
    Comedy: "நகைச்சுவை",
    Horror: "திகில்",
    Romance: "காதல்",
    "Sci-Fi": "அறிவியல் புனைவு",
    Fantasy: "கற்பனை",
    Mystery: "மர்மம்",
    Adventure: "சாகசம்",
  },
  Telugu: {
    Drama: "నాటకం",
    Comedy: "హాస్యం",
    Horror: "భయానకం",
    Romance: "ప్రేమ",
    "Sci-Fi": "విజ్ఞాన కథ",
    Fantasy: "కాల్పనికం",
    Mystery: "రహస్యం",
    Adventure: "సాహసం",
  },
  Marathi: {
    Drama: "नाटक",
    Comedy: "विनोद",
    Horror: "भयकथा",
    Romance: "प्रेमकथा",
    "Sci-Fi": "विज्ञानकथा",
    Fantasy: "कल्पनारम्य",
    Mystery: "रहस्य",
    Adventure: "साहस",
  },
};

type UiText = {
  back: string;
  freeAccess: string;
  login: string;
  forMore: string;
  perMonth: string;
  upgrade: string;
  monthlyRequests: string;
  totalPosts: string;
  titleStart: string;
  titleAccent: string;
  length: string;
  language: string;
  short: string;
  medium: string;
  long: string;
  promptPlaceholder: string;
  keyboardTip: string;
  press: string;
  toGenerate: string;
  alsoWorks: string;
  forNewLine: string;
  generating: string;
  generate: string;
  examples: string;
  selectPrompt: string;
  characterLimit: string;
  charactersRemaining: string;
  shortcuts: string;
  openHelp: string;
  closeHelp: string;
  focusPrompt: string;
  generateStory: string;
  publishStory: string;
  close: string;
  freeLimitReached: string;
  freeLimitMessage: string;
  continueBrowsing: string;
  recentPrompts: string;
  usePrompt: string;
  delete: string;
  clearAll: string;
  noRecentPrompts: string;
};

const UI_TEXT: Record<string, UiText> = {
  English: {
    back: "BACK",
    freeAccess: "Free access for 3 requests",
    login: "Login",
    forMore: "for more!",
    perMonth: "Per Month",
    upgrade: "Upgrade",
    monthlyRequests: "This month request",
    totalPosts: "Total posts",
    titleStart: "Turn Your Ideas Into",
    titleAccent: "Amazing Stories!",
    length: "Length",
    language: "Language",
    short: "Short",
    medium: "Medium",
    long: "Long",
    promptPlaceholder: "Every great story begins with a single idea. What's yours?",
    keyboardTip: "Keyboard tip:",
    press: "Press",
    toGenerate: "to generate",
    alsoWorks: "also works",
    forNewLine: "for new line",
    generating: "Generating...",
    generate: "Generate",
    examples: "Here are some example prompts you can refer to:",
    selectPrompt: "Select a prompt",
    characterLimit: "Character limit reached - generate is disabled",
    charactersRemaining: "characters remaining",
    shortcuts: "Keyboard Shortcuts",
    openHelp: "Open help",
    closeHelp: "Close help",
    focusPrompt: "Focus prompt",
    generateStory: "Generate story",
    publishStory: "Publish story",
    close: "Close",
    freeLimitReached: "Free Limit Reached",
    freeLimitMessage:
      "You've used all 3 free story generations. Login to continue creating more stories.",
    continueBrowsing: "Continue Browsing",
    recentPrompts: "Recent Prompts",
    usePrompt: "Use",
    delete: "Delete",
    clearAll: "Clear All",
    noRecentPrompts: "No recent prompts yet",
  },
};

const TONES = [
  {
    label: "Dark",
    emoji: "🌑",
    activeClass: "bg-gray-700 text-gray-100 border-gray-500 shadow-gray-700/40",
    inactiveClass:
      "bg-white/5 text-gray-400 border-transparent hover:bg-white/10 hover:text-gray-200",
  },
  {
    label: "Whimsical",
    emoji: "🌈",
    activeClass: "bg-sky-500/20 text-sky-300 border-sky-500/60 shadow-sky-500/20",
    inactiveClass:
      "bg-white/5 text-gray-400 border-transparent hover:bg-white/10 hover:text-gray-200",
  },
  {
    label: "Dramatic",
    emoji: "🎬",
    activeClass: "bg-red-500/20 text-red-300 border-red-500/60 shadow-red-500/20",
    inactiveClass:
      "bg-white/5 text-gray-400 border-transparent hover:bg-white/10 hover:text-gray-200",
  },
  {
    label: "Humorous",
    emoji: "😄",
    activeClass:
      "bg-yellow-500/20 text-yellow-300 border-yellow-500/60 shadow-yellow-500/20",
    inactiveClass:
      "bg-white/5 text-gray-400 border-transparent hover:bg-white/10 hover:text-gray-200",
  },
  {
    label: "Suspenseful",
    emoji: "😰",
    activeClass:
      "bg-orange-500/20 text-orange-300 border-orange-500/60 shadow-orange-500/20",
    inactiveClass:
      "bg-white/5 text-gray-400 border-transparent hover:bg-white/10 hover:text-gray-200",
  },
  {
    label: "Heartwarming",
    emoji: "🥰",
    activeClass: "bg-pink-500/20 text-pink-300 border-pink-500/60 shadow-pink-500/20",
    inactiveClass:
      "bg-white/5 text-gray-400 border-transparent hover:bg-white/10 hover:text-gray-200",
  },
] as const;

type ToneLabel = (typeof TONES)[number]["label"];

interface TonePickerProps {
  selected: ToneLabel | "";
  onChange: (tone: ToneLabel | "") => void;
  disabled?: boolean;
}

const TonePicker: React.FC<TonePickerProps> = ({ selected, onChange, disabled }) => (
  <div className="flex flex-wrap gap-2">
    <span className="w-full text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
      🎭 Tone:
    </span>

    {TONES.map((tone) => {
      const isActive = selected === tone.label;

      return (
        <button
          key={tone.label}
          type="button"
          disabled={disabled}
          onClick={() => onChange(isActive ? "" : tone.label)}
          aria-pressed={isActive}
          title={isActive ? `Remove "${tone.label}" tone` : `Set tone to "${tone.label}"`}
          className={`px-3 py-1 rounded-full text-xs font-medium border transition-all duration-200 ${
            isActive ? `${tone.activeClass} shadow-md scale-105` : tone.inactiveClass
          } ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
        >
          {tone.emoji} {tone.label}
        </button>
      );
    })}
  </div>
);

const getUniqueStories = (items: IStories[]): IStories[] => {
  const seen = new Set<string>();

  return items.filter((story, index) => {
    const key = story.uuid || `${story.title}-${index}`;

    if (seen.has(key)) return false;

    seen.add(key);
    return true;
  });
};

const getStoredLanguage = () => {
  return localStorage.getItem(LANGUAGE_STORAGE_KEY) || "English";
};

const getStoredDraft = () => {
  try {
    const saved = localStorage.getItem(DRAFT_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
};

const StoriesComponent = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { register, handleSubmit, reset, setValue } = useForm<Inputs>();

  const draft = useMemo(() => getStoredDraft(), []);

  const [currentPage, setCurrentPage] = useState(1);
  const [stories, setStories] = useState<IStories[]>(
    draft?.stories?.length ? getUniqueStories(draft.stories) : DEFAULT_STORIES
  );
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFilter, setSearchFilter] = useState("all");
  const [selectedPrompt, setSelectedPrompt] = useState("");
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState<string>(draft?.genre || "");
  const [selectedLength, setSelectedLength] = useState<string>(draft?.length || "medium");
  const [selectedTone, setSelectedTone] = useState<ToneLabel | "">(draft?.tone || "");
  const [textareaValue, setTextareaValue] = useState<string>(draft?.prompt || "");
  const [draftStatus, setDraftStatus] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<string>(
    draft?.language || getStoredLanguage()
  );
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);
  const [guestRequestCount, setGuestRequestCount] = useState<number>(() =>
    parseInt(localStorage.getItem("guestRequestCount") || "0", 10)
  );
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [showRestorePrompt, setShowRestorePrompt] = useState(false);
  const [isRecentPromptsOpen, setIsRecentPromptsOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const languageDropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const activeGenerationRef = useRef<{ abort?: () => void } | null>(null);
  const isGenerationInProgressRef = useRef(false);

  const debouncedSearchQuery = useDebounce(searchQuery, 350);
  const { data } = useGetProfileInfoQuery(undefined);
  const userRole = getUserInfo();
  const login = isLoggedIn();
  const [generateModel] = useGenerateModelMutation();
  const [generateFreeModel] = useGenerateFreeModelMutation();
  const { recentPrompts, addPrompt, removePrompt, clearAll } = useRecentPrompts();

  const text = UI_TEXT[selectedLanguage] ?? UI_TEXT.English;
  const genreLabels = GENRE_LABELS[selectedLanguage] ?? GENRE_LABELS.English;

  const filteredStories = useMemo(() => {
    if (!debouncedSearchQuery.trim()) return stories;

    const query = debouncedSearchQuery.toLowerCase();

    return stories.filter((story) => {
      switch (searchFilter) {
        case "title":
          return story.title?.toLowerCase().includes(query);
        case "content":
          return story.content?.toLowerCase().includes(query);
        case "genre":
          return story.tag?.toLowerCase().includes(query);
        case "all":
        default:
          return (
            story.title?.toLowerCase().includes(query) ||
            story.content?.toLowerCase().includes(query) ||
            story.tag?.toLowerCase().includes(query)
          );
      }
    });
  }, [stories, debouncedSearchQuery, searchFilter]);

  const indexOfLastStory = currentPage * STORIES_PER_PAGE;
  const indexOfFirstStory = indexOfLastStory - STORIES_PER_PAGE;
  const currentStories = filteredStories.slice(indexOfFirstStory, indexOfLastStory);
  const totalPages = Math.ceil(filteredStories.length / STORIES_PER_PAGE);

  const isOverLimit = textareaValue.length >= MAX_PROMPT_LENGTH;
  const isNearLimit = textareaValue.length >= MAX_PROMPT_LENGTH * WARN_THRESHOLD;
  const isGenerateDisabled = loading || isOverLimit || !textareaValue.trim();

  const playSoundtrack = (genre: string) => {
    const src = soundtrackMap[genre];

    if (!src) return;

    if (!audioRef.current) {
      audioRef.current = new Audio(src);
    } else {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.src = src;
    }

    audioRef.current.play().catch(() => {
      // Ignore autoplay restrictions.
    });
  };

  const handleCancelGeneration = (isTimeout = false) => {
    activeGenerationRef.current?.abort?.();
    activeGenerationRef.current = null;
    isGenerationInProgressRef.current = false;
    setLoading(false);

    if (!isTimeout) {
      toast("Story generation cancelled.");
    }
  };

  const handleClearPrompt = () => {
    setTextareaValue("");
    setSelectedPrompt("");
    setValue("prompt", "");
    localStorage.removeItem(PROMPT_DRAFT_KEY);
    setDraftStatus("");
    inputRef.current?.focus();
  };

  const handlePublishSuccess = () => {
    setTextareaValue("");
    setSelectedPrompt("");
    setValue("prompt", "");
    localStorage.removeItem(PROMPT_DRAFT_KEY);
    setDraftStatus("");
    reset();
  };

  const handleRestoreDraft = () => {
    const savedDraft = localStorage.getItem(PROMPT_DRAFT_KEY);

    if (savedDraft) {
      setTextareaValue(savedDraft);
      setValue("prompt", savedDraft);
      setDraftStatus("Draft Restored");
    }

    setShowRestorePrompt(false);
  };

  const handleDiscardDraft = () => {
    localStorage.removeItem(PROMPT_DRAFT_KEY);
    setShowRestorePrompt(false);
  };

  const onSubmit: SubmitHandler<Inputs> = async (formData) => {
    if (isGenerationInProgressRef.current) return;

    if (!login && guestRequestCount >= 3) {
      setShowLimitModal(true);
      return;
    }

    if (!formData.prompt.trim()) {
      toast.error("Please enter a prompt to generate a story.");
      return;
    }

    if (getWordCount(formData.prompt) < 10) {
      toast.error("Please enter a prompt with at least 10 words to generate a story.");
      return;
    }

    isGenerationInProgressRef.current = true;
    setLoading(true);

    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    try {
      timeoutId = setTimeout(() => {
        if (isGenerationInProgressRef.current) {
          toast.error("Story generation timed out. Please try again.");
          handleCancelGeneration(true);
        }
      }, 55000);

      const payload = {
        prompt: selectedGenre ? `[Genre: ${selectedGenre}] ${formData.prompt}` : formData.prompt,
        wordLength:
          selectedLength === "short" ? 175 : selectedLength === "long" ? 800 : 450,
        language: selectedLanguage,
        tone: selectedTone || undefined,
      };

      const generationRequest = login ? generateModel(payload) : generateFreeModel(payload);

      activeGenerationRef.current = generationRequest as unknown as { abort?: () => void };

      const res = await generationRequest.unwrap();

      if (res) {
        toast.success(res.message);
        addPrompt(formData.prompt);
        setStories(getUniqueStories(res.data as IStories[]));
        setTextareaValue("");
        setSelectedPrompt("");
        setValue("prompt", "");
        localStorage.removeItem(DRAFT_KEY);
        localStorage.removeItem(PROMPT_DRAFT_KEY);
        setDraftStatus("");
        reset();

        if (!login) {
          const newCount = guestRequestCount + 1;
          setGuestRequestCount(newCount);
          localStorage.setItem("guestRequestCount", String(newCount));
        }
      }
    } catch (error: unknown) {
      const message = getErrorMessage(error);

      if (message !== "Story generation was cancelled.") {
        toast.error(message);
      }
    } finally {
      if (timeoutId) clearTimeout(timeoutId);

      activeGenerationRef.current = null;
      isGenerationInProgressRef.current = false;
      setLoading(false);
    }
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchQuery, searchFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const draftData = {
        prompt: textareaValue,
        genre: selectedGenre,
        length: selectedLength,
        language: selectedLanguage,
        tone: selectedTone,
        stories,
      };

      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draftData));
      } catch (err) {
        if (err instanceof DOMException && err.name === "QuotaExceededError") {
          toast.error("Couldn't autosave draft — storage limit reached.");
        }
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [textareaValue, selectedGenre, selectedLength, selectedLanguage, selectedTone, stories]);

  useEffect(() => {
    const selectedLocale =
      LANGUAGES.find((language) => language.name === selectedLanguage)?.code ?? "en";

    localStorage.setItem(LANGUAGE_STORAGE_KEY, selectedLanguage);
    document.documentElement.lang = selectedLocale;
  }, [selectedLanguage]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }

      if (
        languageDropdownRef.current &&
        !languageDropdownRef.current.contains(event.target as Node)
      ) {
        setIsLanguageDropdownOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsDropdownOpen(false);
        setIsLanguageDropdownOpen(false);
        setShowHelpModal(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (!location.state) return;

    const state = location.state as { prompt?: string; genre?: string };

    if (state.prompt) {
      setTextareaValue(state.prompt);
      setValue("prompt", state.prompt);
    }

    if (state.genre) {
      const matchedGenre = GENRES.find((genre) => genre.name === state.genre)?.value ?? "";
      setSelectedGenre(matchedGenre);
    }

    navigate(location.pathname, {
      replace: true,
      state: {},
    });
  }, [location, navigate, setValue]);

  useEffect(() => {
    setValue("prompt", textareaValue);
  }, [textareaValue, setValue]);

  useEffect(() => {
    const savedDraft = localStorage.getItem(PROMPT_DRAFT_KEY);

    if (savedDraft && savedDraft.trim().length > 0 && !textareaValue.trim()) {
      setShowRestorePrompt(true);
    }
  }, [textareaValue]);

  useEffect(() => {
    if (!textareaValue.trim()) return;

    const timer = setTimeout(() => {
      localStorage.setItem(PROMPT_DRAFT_KEY, textareaValue);
      setDraftStatus("Draft Saved");
    }, 2000);

    return () => clearTimeout(timer);
  }, [textareaValue]);

  useEffect(() => {
    return () => {
      activeGenerationRef.current?.abort?.();
      audioRef.current?.pause();
    };
  }, []);

  useKeyboardShortcuts({
    onOpenHelp: () => setShowHelpModal(true),
    onCloseHelp: () => setShowHelpModal(false),
    onGenerate: () => {
      if (isGenerateDisabled) return;

      const form = inputRef.current?.closest("form");

      if (form) form.requestSubmit();
    },
    onPublish: () => {
      const publishBtn = document.getElementById("publish-story-btn");
      publishBtn?.click();
    },
    focusPrompt: () => {
      inputRef.current?.focus();
    },
    hasStory: stories.length > 0,
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors duration-300 dark:bg-slate-950 dark:text-slate-100 flex flex-col w-full box-border relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-blue-600/5 rounded-full blur-[140px] pointer-events-none select-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-600/5 rounded-full blur-[140px] pointer-events-none select-none" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-24 relative z-10 w-full flex-grow box-border">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-10 select-none w-full box-border">
          <div className="w-full sm:w-auto flex justify-start">
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-[#111827]/40 border border-slate-200 dark:border-white/10 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:shadow-sm transition-all duration-150 active:scale-[0.98]"
            >
              <i className="fa-solid fa-arrow-left text-[10px]" />
              <span>{text.back}</span>
            </Link>
          </div>

          {!login && (
            <div className="text-center w-full sm:w-auto">
              <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-500/5 border border-blue-500/10 text-slate-600 dark:text-slate-400 text-xs font-medium shadow-sm dark:shadow-none">
                <span>
                  {text.freeAccess} —{" "}
                  <Link
                    to="/login"
                    className="text-blue-600 dark:text-blue-400 font-bold hover:underline"
                  >
                    {text.login}
                  </Link>{" "}
                  {text.forMore}
                </span>
              </div>
            </div>
          )}

          <div className="flex flex-col items-center sm:items-end w-full sm:w-auto">
            <div className="inline-flex items-center gap-3 px-3.5 py-2 rounded-xl bg-white dark:bg-[#111827]/40 border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-700 dark:text-slate-300 shadow-sm dark:shadow-none">
              <span>
                <span className="text-slate-400 font-medium lowercase tracking-normal">
                  {text.perMonth}:
                </span>{" "}
                {getRequestLimit(userRole?.subscriptionType as string)}
              </span>

              <span className="h-3.5 w-px bg-slate-200 dark:bg-white/10" />

              <Link
                to="/pricing"
                className="text-blue-600 dark:text-blue-400 hover:text-blue-500 flex items-center gap-1.5"
              >
                <span>{text.upgrade}</span>
                <i className="fas fa-bolt text-amber-400 text-[11px]" />
              </Link>
            </div>

            <div className="mt-2.5 text-[11px] font-semibold tracking-wide text-slate-400 dark:text-slate-500 text-center sm:text-right uppercase space-y-0.5">
              <div>
                {text.monthlyRequests}:{" "}
                {login ? data?.requestsThisMonth ?? 0 : guestRequestCount}
              </div>
              <div>{text.totalPosts}: {login ? data?.postsCount ?? 0 : 0}</div>
            </div>
          </div>
        </div>

        <div className="mb-12 max-w-3xl mx-auto text-center select-none">
          <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
            ✨ {text.titleStart}{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
              {text.titleAccent}
            </span>{" "}
            ✨
          </h1>
        </div>

        <div className="max-w-3xl mx-auto w-full box-border space-y-6">
          <div className="bg-white dark:bg-[#111827]/40 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl sm:rounded-3xl p-5 sm:p-7 shadow-sm hover:shadow-xl transition-shadow duration-300 w-full box-border">
            {showRestorePrompt && (
              <div className="mb-4 p-3 rounded-lg border border-indigo-500/40 bg-indigo-500/10">
                <p className="text-sm text-slate-600 dark:text-gray-300 mb-2">
                  📄 A previously saved draft was found. Restore it?
                </p>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleRestoreDraft}
                    className="px-3 py-1 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-sm"
                  >
                    Restore
                  </button>

                  <button
                    type="button"
                    onClick={handleDiscardDraft}
                    className="px-3 py-1 rounded-md bg-red-600 hover:bg-red-700 text-white text-sm"
                  >
                    Discard
                  </button>
                </div>
              </div>
            )}

            <form className="space-y-6 w-full box-border" onSubmit={handleSubmit(onSubmit)}>
              <div className="w-full box-border select-none">
                <div className="flex flex-wrap gap-2">
                  {GENRES.map((genre) => (
                    <button
                      key={genre.value}
                      type="button"
                      disabled={loading}
                      onClick={() => {
                        if (loading) return;

                        const newGenre = selectedGenre === genre.value ? "" : genre.value;

                        setSelectedGenre(newGenre);

                        if (newGenre) {
                          playSoundtrack(newGenre);
                        } else if (audioRef.current) {
                          audioRef.current.pause();
                          audioRef.current.currentTime = 0;
                        }
                      }}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold tracking-wide uppercase border transition-all duration-150 active:scale-[0.97] ${
                        selectedGenre === genre.value
                          ? "bg-gradient-to-r from-blue-600 to-indigo-600 border-transparent text-white shadow-md shadow-blue-500/10"
                          : "bg-slate-50 border-slate-200/60 text-slate-600 hover:bg-slate-100 dark:bg-white/5 dark:border-white/5 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-slate-200"
                      } ${loading ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
                    >
                      <span className="mr-1">{genre.icon}</span>
                      <span>{genreLabels[genre.name]}</span>
                    </button>
                  ))}
                </div>
              </div>

              <TonePicker selected={selectedTone} onChange={setSelectedTone} disabled={loading} />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-slate-100 dark:border-white/5 w-full box-border select-none">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mr-1">
                    📏 {text.length}:
                  </span>

                  {(["short", "medium", "long"] as const).map((length) => (
                    <button
                      key={length}
                      type="button"
                      disabled={loading}
                      onClick={() => setSelectedLength(length)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wide border transition-all duration-150 ${
                        selectedLength === length
                          ? "bg-blue-600 border-transparent text-white shadow-sm"
                          : "bg-slate-50 border-slate-200/60 text-slate-500 hover:bg-slate-100 dark:bg-white/5 dark:border-white/5 dark:text-slate-400 dark:hover:bg-white/10"
                      } ${loading ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
                    >
                      {text[length]}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2" ref={languageDropdownRef}>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mr-1">
                    🌐 {text.language}:
                  </span>

                  <div className="relative">
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() =>
                        !loading && setIsLanguageDropdownOpen(!isLanguageDropdownOpen)
                      }
                      className={`flex items-center gap-2 px-3.5 py-1.5 bg-slate-50 text-slate-600 border border-slate-200 dark:bg-white/5 dark:border-white/5 dark:text-slate-300 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-slate-100 dark:hover:bg-white/10 transition-all duration-150 select-none ${
                        loading ? "cursor-not-allowed opacity-50" : "cursor-pointer"
                      }`}
                    >
                      <span>
                        {LANGUAGES.find((language) => language.name === selectedLanguage)?.name ||
                          "English"}
                      </span>
                      <span className="text-slate-400 dark:text-slate-500 text-[9px]">
                        ▼
                      </span>
                    </button>

                    {isLanguageDropdownOpen && (
                      <ul className="absolute right-0 z-20 mt-1.5 max-h-48 w-40 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl shadow-xl focus:outline-none divide-y divide-slate-100 dark:divide-white/5 p-1 box-border list-none m-0">
                        {LANGUAGES.map((language) => (
                          <li key={language.code} className="p-0 m-0 list-none">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedLanguage(language.name);
                                setIsLanguageDropdownOpen(false);
                              }}
                              className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-lg transition-colors duration-150 cursor-pointer ${
                                selectedLanguage === language.name
                                  ? "bg-blue-600 text-white font-bold"
                                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white"
                              }`}
                            >
                              {language.name}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>

              <div className="relative border border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-slate-950/30 rounded-2xl p-4 transition-all focus-within:border-blue-500/30 focus-within:bg-white dark:focus-within:bg-[#111827]/20 w-full box-border">
                <textarea
                  {...register("prompt")}
                  ref={(element) => {
                    register("prompt").ref(element);
                    inputRef.current = element;
                  }}
                  disabled={loading}
                  aria-busy={loading}
                  className={`w-full h-32 sm:h-40 resize-none border-none outline-none bg-transparent text-slate-800 dark:text-slate-200 focus:ring-0 text-sm sm:text-base leading-relaxed placeholder:italic placeholder:text-slate-400 dark:placeholder:text-slate-500 pr-12 transition-colors duration-200 ${
                    isOverLimit
                      ? "ring-1 ring-red-500 rounded-lg p-2"
                      : isNearLimit
                      ? "ring-1 ring-yellow-400 rounded-lg p-2"
                      : ""
                  }`}
                  placeholder={text.promptPlaceholder}
                  value={textareaValue}
                  maxLength={MAX_PROMPT_LENGTH}
                  onChange={(event) => {
                    setTextareaValue(event.target.value);
                    setValue("prompt", event.target.value);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();

                      if (!isGenerateDisabled) {
                        event.currentTarget.closest("form")?.requestSubmit();
                      }
                    }
                  }}
                />

                <div className="absolute right-3.5 top-3.5 flex flex-col gap-2.5">
                  {textareaValue.length > 0 && (
                    <button
                      type="button"
                      disabled={loading}
                      onClick={handleClearPrompt}
                      className={`w-7 h-7 flex items-center justify-center rounded-lg bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-400 shadow-sm transition-colors duration-150 ${
                        loading
                          ? "cursor-not-allowed opacity-50"
                          : "cursor-pointer hover:text-red-500 dark:hover:text-red-400"
                      }`}
                      aria-label={text.close}
                      title={text.close}
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2.5}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => !loading && setIsRecentPromptsOpen(!isRecentPromptsOpen)}
                    className={`w-7 h-7 flex items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm transition-colors duration-150 ${
                      loading ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:bg-blue-500"
                    }`}
                    aria-label={text.recentPrompts}
                    title={text.recentPrompts}
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </button>
                </div>

                <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-200/40 dark:border-white/5 select-none w-full box-border">
                  <div className="flex-1 min-w-0 pr-4">
                    {isOverLimit ? (
                      <p className="text-[11px] font-semibold text-red-500 dark:text-red-400 flex items-center gap-1 truncate m-0">
                        <span>⚠</span> {text.characterLimit}
                      </p>
                    ) : isNearLimit ? (
                      <p className="text-[11px] font-semibold text-amber-500 dark:text-amber-400 flex items-center gap-1 truncate m-0">
                        <span>⚠</span> {MAX_PROMPT_LENGTH - textareaValue.length}{" "}
                        {text.charactersRemaining}
                      </p>
                    ) : (
                      <span />
                    )}
                  </div>

                  <span
                    className={`text-[11px] font-bold tabular-nums shrink-0 ml-auto ${
                      isOverLimit
                        ? "text-red-500 dark:text-red-400"
                        : isNearLimit
                        ? "text-amber-500"
                        : "text-slate-400"
                    }`}
                  >
                    {textareaValue.length} / {MAX_PROMPT_LENGTH}
                  </span>
                </div>
              </div>

              {draftStatus && (
                <p className="text-xs text-green-500 mt-2 px-1">💾 {draftStatus}</p>
              )}

              <div className="text-[11px] font-medium leading-relaxed text-slate-400 dark:text-slate-500 select-none w-full box-border">
                💡{" "}
                <span className="font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mr-1">
                  {text.keyboardTip}
                </span>
                {text.press}{" "}
                <kbd className="px-1.5 py-0.5 text-[10px] font-bold bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/10 rounded-md text-slate-700 dark:text-slate-300 mx-0.5 shadow-sm">
                  Enter
                </kbd>{" "}
                {text.toGenerate} &bull;{" "}
                <kbd className="px-1.5 py-0.5 text-[10px] font-bold bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/10 rounded-md text-slate-700 dark:text-slate-300 mx-0.5 shadow-sm">
                  Ctrl + Enter
                </kbd>{" "}
                {text.alsoWorks} &bull;{" "}
                <kbd className="px-1.5 py-0.5 text-[10px] font-bold bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/10 rounded-md text-slate-700 dark:text-slate-300 mx-0.5 shadow-sm">
                  Shift + Enter
                </kbd>{" "}
                {text.forNewLine}
              </div>

              <div className="flex justify-end pt-2 w-full box-border">
                {loading && (
                  <button
                    type="button"
                    onClick={() => handleCancelGeneration()}
                    className="mr-3 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 text-xs sm:text-sm font-bold py-3 px-6 rounded-xl transition-all duration-150 active:scale-[0.98] select-none uppercase tracking-wider"
                  >
                    Cancel
                  </button>
                )}

                <button
                  type="submit"
                  disabled={isGenerateDisabled}
                  aria-busy={loading}
                  aria-disabled={isGenerateDisabled}
                  className={`w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-bold py-3 px-6 rounded-xl shadow-md shadow-blue-500/10 transition-all duration-150 active:scale-[0.98] select-none uppercase tracking-wider flex items-center justify-center gap-2 ${
                    isGenerateDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                  } group`}
                >
                  {loading ? (
                    <i className="fas fa-circle-notch text-sm animate-spin" />
                  ) : (
                    <i className="fas fa-wand-magic-sparkles text-sm group-hover:scale-110 transition-transform duration-200" />
                  )}
                  <span>{loading ? text.generating : text.generate}</span>
                </button>
              </div>
            </form>
          </div>

          <div className="w-full text-left box-border">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2 select-none px-0.5">
              {text.examples}
            </h3>

            <div className="relative w-full" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full p-3.5 bg-white dark:bg-[#111827]/40 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:border-blue-500/30 flex items-center justify-between text-xs sm:text-sm font-medium text-left transition-all duration-150 cursor-pointer select-none shadow-sm"
              >
                <span className="truncate pr-4">{selectedPrompt || text.selectPrompt}</span>
                <span
                  className={`text-slate-400 dark:text-slate-500 text-[9px] transition-transform duration-150 shrink-0 ${
                    isDropdownOpen ? "rotate-180" : ""
                  }`}
                >
                  ▼
                </span>
              </button>

              {isDropdownOpen && (
                <ul className="absolute z-30 w-full mt-1.5 max-h-60 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl shadow-xl focus:outline-none divide-y divide-slate-100 dark:divide-white/5 p-1 box-border list-none m-0">
                  {prompts.map((item) => (
                    <li key={item.id} className="p-0 m-0 list-none">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPrompt(item.prompt);
                          setTextareaValue(item.prompt);
                          setValue("prompt", item.prompt);
                          setIsDropdownOpen(false);
                        }}
                        className="w-full text-left px-4 py-3 text-xs sm:text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white rounded-lg transition-colors duration-150 whitespace-normal break-words leading-relaxed font-medium cursor-pointer"
                      >
                        {item.prompt}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {stories.length > 0 && (
          <div className="my-8 bg-slate-800/80 backdrop-blur-xl border border-slate-700/50 p-4 rounded-2xl">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search stories..."
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <select
                value={searchFilter}
                onChange={(event) => setSearchFilter(event.target.value)}
                className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All Fields</option>
                <option value="title">Title</option>
                <option value="content">Content</option>
                <option value="genre">Genre</option>
              </select>
            </div>

            {searchQuery && (
              <div className="mt-2 text-sm text-slate-400">
                Found {filteredStories.length}{" "}
                {filteredStories.length === 1 ? "story" : "stories"}
              </div>
            )}
          </div>
        )}

        <StoriesViewComponent
          stories={currentStories}
          isLogin={login}
          setStories={setStories}
          onPublishSuccess={handlePublishSuccess}
          isLoading={loading}
        />

        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-4 mt-6">
            <button
              type="button"
              onClick={() => setCurrentPage((page) => page - 1)}
              disabled={currentPage === 1}
              className="px-4 py-2 rounded bg-slate-700 text-white disabled:opacity-50"
            >
              Previous
            </button>

            <span>
              Page {currentPage} of {totalPages}
            </span>

            <button
              type="button"
              onClick={() => setCurrentPage((page) => page + 1)}
              disabled={currentPage === totalPages}
              className="px-4 py-2 rounded bg-slate-700 text-white disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>

      <RecentPromptsPanel
        recentPrompts={recentPrompts}
        onSelectPrompt={(prompt) => {
          setTextareaValue(prompt);
          setValue("prompt", prompt);
          setIsRecentPromptsOpen(false);
        }}
        onRemovePrompt={removePrompt}
        onClearAll={clearAll}
        isOpen={isRecentPromptsOpen}
        onToggle={() => setIsRecentPromptsOpen(!isRecentPromptsOpen)}
        text={{
          recentPrompts: text.recentPrompts,
          usePrompt: text.usePrompt,
          delete: text.delete,
          clearAll: text.clearAll,
          noRecentPrompts: text.noRecentPrompts,
          close: text.close,
        }}
      />

      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 dark:border-white/10 rounded-2xl p-6 max-w-md w-full text-slate-900 dark:bg-slate-900 dark:text-white shadow-xl">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 tracking-tight select-none border-b border-slate-100 dark:border-white/5 pb-2.5">
              {text.shortcuts}
            </h2>

            <div className="space-y-3.5 text-slate-600 text-xs sm:text-sm dark:text-slate-400 font-medium select-none">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">{text.openHelp}</span>
                <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-white/10 rounded border border-slate-200 dark:border-white/10 text-[11px] font-bold shadow-sm">
                  ?
                </kbd>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-400">{text.closeHelp}</span>
                <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-white/10 rounded border border-slate-200 dark:border-white/10 text-[11px] font-bold shadow-sm">
                  Esc
                </kbd>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-400">{text.focusPrompt}</span>
                <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-white/10 rounded border border-slate-200 dark:border-white/10 text-[11px] font-bold shadow-sm">
                  /
                </kbd>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-400">{text.generateStory}</span>
                <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-white/10 rounded border border-slate-200 dark:border-white/10 text-[11px] font-bold shadow-sm">
                  Ctrl + Enter
                </kbd>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-400">{text.publishStory}</span>
                <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-white/10 rounded border border-slate-200 dark:border-white/10 text-[11px] font-bold shadow-sm">
                  Ctrl + S
                </kbd>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowHelpModal(false)}
              className="mt-6 w-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase tracking-wider py-2.5 rounded-xl transition-colors shadow-sm select-none cursor-pointer"
            >
              {text.close}
            </button>
          </div>
        </div>
      )}

      {showLimitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 dark:border-white/10 rounded-2xl shadow-xl max-w-md w-full p-6 text-slate-900 dark:bg-slate-900 dark:text-white">
            <div className="text-center">
              <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-500/10 select-none">
                <i className="fas fa-lock text-xl text-blue-500 dark:text-blue-400" />
              </div>

              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight select-none">
                {text.freeLimitReached}
              </h3>

              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed font-medium">
                {text.freeLimitMessage}
              </p>

              <div className="flex flex-col gap-2.5 w-full">
                <Link
                  to="/login"
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold uppercase tracking-wider py-3 px-4 rounded-xl text-center shadow-md shadow-blue-500/10 transition-all duration-150 active:scale-[0.98] select-none"
                >
                  {text.login}
                </Link>

                <button
                  type="button"
                  onClick={() => setShowLimitModal(false)}
                  className="w-full bg-slate-50 hover:bg-slate-100 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 text-xs font-bold uppercase tracking-wider py-3 px-4 rounded-xl transition-all duration-150 active:scale-[0.98] select-none cursor-pointer border border-slate-200/60 dark:border-transparent"
                >
                  {text.continueBrowsing}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading && <StoryGeneratingAnimation onCancel={handleCancelGeneration} />}

      <Toaster position="top-right" reverseOrder={false} />
    </div>
  );
};

export default StoriesComponent;
