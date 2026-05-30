import {
  AlertTriangle,
  ArrowRight,
  Bot,
  BriefcaseBusiness,
  ChevronDown,
  CheckCircle2,
  Clock3,
  Database,
  ExternalLink,
  FileText,
  Hammer,
  Home,
  LayoutDashboard,
  Menu,
  MapPin,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Sprout,
  Star,
  Upload,
  UserRound,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import {
  Dispatch,
  FormEvent,
  MouseEvent,
  ReactNode,
  SetStateAction,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  createEvidence,
  createJob,
  fetchState,
  updateJobStatus,
} from "./api/client";
import categoryCleaning from "./assets/cleaning.png";
import categoryElectric from "./assets/electric.png";
import categoryGeneral from "./assets/general.png";
import categoryGardening from "./assets/gardening.png";
import categoryPlumbing from "./assets/plumbing.png";
import categoryRepair from "./assets/repair.png";
import heroEvidence from "./assets/hero-evidence.png";
import processEvidence from "./assets/process-evidence.webp";
import processRequest from "./assets/process-request.webp";
import processReview from "./assets/process-review.webp";
import {
  arkivEvents as initialArkivEvents,
  evidence as initialEvidence,
  jobs as initialJobs,
  providerProfiles as initialProviderProfiles,
  reviews as initialReviews,
  services as initialServices,
  users as initialUsers,
} from "./data";
import type {
  ArkivEvent,
  EvidenceType,
  Job,
  JobEvidence,
  JobStatus,
  ProviderProfile,
  RemoteState,
  Review,
  Service,
  User,
} from "./types";

type Route =
  | { name: "home" }
  | { name: "services" }
  | { name: "serviceProviders"; serviceId: string }
  | { name: "providerProfile"; providerId: string }
  | { name: "newJob"; serviceId: string | null; providerId: string | null }
  | { name: "jobDetail"; jobId: string }
  | { name: "providerDashboard" }
  | { name: "newEvidence"; jobId: string }
  | { name: "admin" }
  | { name: "notFound" };

const statusLabels: Record<JobStatus, string> = {
  requested: "Solicitado",
  accepted: "Aceptado",
  in_progress: "En ejecución",
  evidence_uploaded: "Evidencia subida",
  ai_reviewed: "IA revisada",
  completed: "Completado",
};

const statusOrder: JobStatus[] = [
  "requested",
  "accepted",
  "in_progress",
  "evidence_uploaded",
  "ai_reviewed",
  "completed",
];

const categoryLabels: Record<string, string> = {
  home_repair: "Reparaciones del hogar",
  outdoor: "Exterior",
  home_care: "Cuidado del hogar",
  maintenance: "Mantenimiento",
};

const categoryShowcaseItems = [
  {
    key: "cleaning",
    title: "Limpieza",
    description: "Limpieza profunda para hogares, oficinas y espacios comunes.",
    image: categoryCleaning,
    imageAlt: "Elementos de limpieza para hogares y oficinas.",
  },
  {
    key: "electric",
    title: "Electricidad",
    description: "Instalación y reparación de tomas, luminarias y tableros simples.",
    image: categoryElectric,
    imageAlt: "Herramientas y componentes para trabajos de electricidad.",
  },
  {
    key: "gardening",
    title: "Jardinería",
    description: "Corte de césped, mantenimiento de jardines y limpieza de patios.",
    image: categoryGardening,
    imageAlt: "Herramientas de jardinería para mantenimiento de espacios exteriores.",
  },
  {
    key: "repair",
    title: "Reparaciones",
    description: "Visitas de diagnóstico y mantenimiento preventivo del hogar.",
    image: categoryRepair,
    imageAlt: "Herramientas para reparaciones y mantenimiento preventivo del hogar.",
  },
  {
    key: "plumbing",
    title: "Plomería",
    description: "Reparaciones de pérdidas, grifería, desagües y conexiones de agua.",
    image: categoryPlumbing,
    imageAlt: "Herramientas y materiales para trabajos de plomería.",
  },
  {
    key: "maintenance",
    title: "Mantenimiento general",
    description: "Arreglos generales, ajustes, colocaciones y mantenimiento menor.",
    image: categoryGeneral,
    imageAlt: "Herramientas para mantenimiento general del hogar.",
  },
];

const categoryShowcaseColumns = [
  [categoryShowcaseItems[0], categoryShowcaseItems[3]],
  [categoryShowcaseItems[1], categoryShowcaseItems[4]],
  [categoryShowcaseItems[2], categoryShowcaseItems[5]],
];

function parseRoute(): Route {
  const path = window.location.pathname;
  const query = new URLSearchParams(window.location.search);
  const parts = path.split("/").filter(Boolean);

  if (parts.length === 0) return { name: "home" };
  if (parts[0] === "services" && parts.length === 1) return { name: "services" };
  if (parts[0] === "services" && parts[2] === "providers") {
    return { name: "serviceProviders", serviceId: parts[1] };
  }
  if (parts[0] === "providers" && parts[1]) return { name: "providerProfile", providerId: parts[1] };
  if (parts[0] === "jobs" && parts[1] === "new") {
    return { name: "newJob", serviceId: query.get("serviceId"), providerId: query.get("providerId") };
  }
  if (parts[0] === "jobs" && parts[1]) return { name: "jobDetail", jobId: parts[1] };
  if (parts[0] === "provider" && parts.length === 1) return { name: "providerDashboard" };
  if (parts[0] === "provider" && parts[1] === "jobs" && parts[3] === "evidence" && parts[4] === "new") {
    return { name: "newEvidence", jobId: parts[2] };
  }
  if (parts[0] === "admin") return { name: "admin" };

  return { name: "notFound" };
}

function navigate(path: string) {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
  window.scrollTo({ top: 0 });
}

function useRoute() {
  const [route, setRoute] = useState<Route>(() => parseRoute());

  useEffect(() => {
    const onPop = () => setRoute(parseRoute());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  return route;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function serviceIcon(icon: string | null) {
  const icons: Record<string, ReactNode> = {
    wrench: <Wrench size={20} />,
    sprout: <Sprout size={20} />,
    bolt: <Zap size={20} />,
    sparkles: <Sparkles size={20} />,
    hammer: <Hammer size={20} />,
    settings: <Settings size={20} />,
  };

  return icon ? (icons[icon] ?? <BriefcaseBusiness size={20} />) : <BriefcaseBusiness size={20} />;
}

function findUser(users: User[], id: string | null) {
  return users.find((user) => user.id === id) ?? null;
}

function serviceSlug(service: Service) {
  return service.name.toLowerCase();
}

const arkivEntityExplorerUrl = "https://data.arkiv.network";
const arkivBlockExplorerUrl = "https://explorer.braga.hoodi.arkiv.network";

type ArkivReferenceKind = "entity" | "tx";

function isArkivHash(value: string | null | undefined): value is string {
  return /^0x[0-9a-fA-F]{64}$/.test(value ?? "");
}

function isArkivEntityKey(value: string | null | undefined): value is string {
  return isArkivHash(value);
}

function isArkivTxHash(value: string | null | undefined): value is string {
  return isArkivHash(value);
}

function arkivEntityUrl(entityKey: string) {
  const params = new URLSearchParams({ q: `$key = "${entityKey}"` });
  return `${arkivEntityExplorerUrl}/?${params.toString()}`;
}

function arkivTxUrl(txHash: string) {
  return `${arkivBlockExplorerUrl}/tx/${txHash}`;
}

function compactArkivId(value: string) {
  return value.length > 18 ? `${value.slice(0, 8)}...${value.slice(-6)}` : value;
}

function arkivReferenceUrl(value: string | null | undefined, kind: ArkivReferenceKind) {
  if (!isArkivHash(value)) return null;
  if (kind === "entity") return arkivEntityUrl(value);
  if (kind === "tx") return arkivTxUrl(value);
  return null;
}

function ArkivReference({
  value,
  kind = "entity",
  fallback = "pendiente",
}: {
  value: string | null | undefined;
  kind?: ArkivReferenceKind;
  fallback?: string;
}) {
  const href = arkivReferenceUrl(value, kind);
  const referenceValue = value ?? "";

  if (!href) {
    return <code>{value ? fallback : "pendiente"}</code>;
  }

  return (
    <a className="arkiv-reference" href={href} target="_blank" rel="noreferrer" title={referenceValue}>
      <code>{compactArkivId(referenceValue)}</code>
      <ExternalLink size={13} />
    </a>
  );
}

function App() {
  const route = useRoute();
  const [menuOpen, setMenuOpen] = useState(false);
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [services, setServices] = useState<Service[]>(initialServices);
  const [providerProfiles, setProviderProfiles] = useState<ProviderProfile[]>(initialProviderProfiles);
  const [jobs, setJobs] = useState<Job[]>(initialJobs);
  const [evidence, setEvidence] = useState<JobEvidence[]>(initialEvidence);
  const [reviews, setReviews] = useState<Review[]>(initialReviews);
  const [arkivEvents, setArkivEvents] = useState<ArkivEvent[]>(initialArkivEvents);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  function applyRemoteState(state: RemoteState) {
    setUsers(state.users);
    setServices(state.services);
    setProviderProfiles(state.providerProfiles);
    setJobs(state.jobs);
    setEvidence(state.evidence);
    setReviews(state.reviews);
    setArkivEvents(state.arkivEvents);
    setSyncMessage(null);
  }

  useEffect(() => {
    fetchState()
      .then(applyRemoteState)
      .catch(() => setSyncMessage("API local sin conexión; la página sigue en modo demo."));
  }, []);

  const context = useMemo(
    () => ({
      users,
      services,
      providerProfiles,
      reviews,
      jobs,
      evidence,
      arkivEvents,
      setJobs,
      setEvidence,
      setArkivEvents,
      applyRemoteState,
      setSyncMessage,
    }),
    [users, services, providerProfiles, reviews, jobs, evidence, arkivEvents],
  );

  return (
    <div className="app-shell">
      <Announcement />
      <header className="site-header">
        <a className="brand" href="/" onClick={linkTo("/")}>
          <span className="brand-mark">SV</span>
          <span>Servicios Verificables</span>
        </a>
        <button className="icon-button mobile-menu" aria-label="Abrir menu" onClick={() => setMenuOpen(true)}>
          <Menu size={20} />
        </button>
        <nav className={menuOpen ? "nav-links open" : "nav-links"}>
          <button className="icon-button close-menu" aria-label="Cerrar menu" onClick={() => setMenuOpen(false)}>
            <X size={20} />
          </button>
          <NavLink href="/" icon={<Home size={16} />} label="Inicio" onClick={() => setMenuOpen(false)} />
          <NavLink href="/services" icon={<Search size={16} />} label="Servicios" onClick={() => setMenuOpen(false)} />
          <NavLink
            href="/provider"
            icon={<UserRound size={16} />}
            label="Prestador"
            onClick={() => setMenuOpen(false)}
          />
          <NavLink
            href="/admin"
            icon={<LayoutDashboard size={16} />}
            label="Admin"
            onClick={() => setMenuOpen(false)}
          />
        </nav>
        <a className="header-cta" href="/jobs/job_001" onClick={linkTo("/jobs/job_001")}>
          Demo
          <ArrowRight size={16} />
        </a>
      </header>
      {syncMessage && <div className="sync-message">{syncMessage}</div>}

      {route.name === "home" && <HomePage jobs={jobs} evidence={evidence} />}
      {route.name === "services" && <ServicesPage services={services} />}
      {route.name === "serviceProviders" && (
        <ProvidersPage serviceId={route.serviceId} services={services} providerProfiles={providerProfiles} />
      )}
      {route.name === "providerProfile" && <ProviderProfilePage providerId={route.providerId} context={context} />}
      {route.name === "newJob" && (
        <NewJobPage serviceId={route.serviceId} providerId={route.providerId} context={context} />
      )}
      {route.name === "jobDetail" && <JobDetailPage jobId={route.jobId} context={context} />}
      {route.name === "providerDashboard" && <ProviderDashboard context={context} />}
      {route.name === "newEvidence" && <NewEvidencePage jobId={route.jobId} context={context} />}
      {route.name === "admin" && <AdminPage jobs={jobs} evidence={evidence} arkivEvents={arkivEvents} />}
      {route.name === "notFound" && <NotFoundPage />}
    </div>
  );
}

function linkTo(path: string) {
  return (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    navigate(path);
  };
}

function NavLink({
  href,
  icon,
  label,
  onClick,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  onClick?: () => void;
}) {
  return (
    <a
      href={href}
      onClick={(event) => {
        event.preventDefault();
        onClick?.();
        navigate(href);
      }}
    >
      {icon}
      {label}
    </a>
  );
}

function Announcement() {
  return (
    <div className="announcement">
      <span>Evidencia local, análisis IA y eventos verificables en Arkiv Braga.</span>
      <a href="/admin" onClick={linkTo("/admin")}>
        Auditar demo
      </a>
    </div>
  );
}

function HomePage({ jobs, evidence }: { jobs: Job[]; evidence: JobEvidence[] }) {
  const completed = jobs.filter((job) => job.status === "completed").length;
  const verifiedEvidence = evidence.filter((item) => item.arkivEntityKey).length;
  const serviceChoices = [
    { label: "Limpieza", icon: <Sparkles size={17} /> },
    { label: "Electricidad", icon: <Zap size={17} /> },
    { label: "Jardinería", icon: <Sprout size={17} /> },
    { label: "Mantenimiento general", icon: <Settings size={17} /> },
    { label: "Plomería", icon: <Wrench size={17} /> },
    { label: "Reparaciones", icon: <Hammer size={17} /> },
  ];
  const zoneChoices = ["Este", "Oeste", "Norte", "Sur"];
  const [selectedService, setSelectedService] = useState(serviceChoices[0].label);
  const [selectedZone, setSelectedZone] = useState("");
  const [openDropdown, setOpenDropdown] = useState<"service" | "zone" | null>("service");

  function submitHeroSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const service = initialServices.find((item) => item.name.toLowerCase() === selectedService.toLowerCase());
    navigate(service ? `/services/${service.id}/providers` : "/services");
  }

  function movePromoMarquee(event: MouseEvent<HTMLElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const offset = (event.clientX - bounds.left) / bounds.width - 0.5;
    event.currentTarget.style.setProperty("--marquee-x", `${offset * 64}px`);
  }

  function resetPromoMarquee(event: MouseEvent<HTMLElement>) {
    event.currentTarget.style.setProperty("--marquee-x", "0px");
  }

  return (
    <main>
      <section className="hero">
        <div className="hero-copy">
          <h1>Servicios con evidencia que se pueden contratar.</h1>
          <p>
            Buscá servicios, elegí tu zona y contratá con confianza.
            <br></br>
            Clientes y prestadores son respaldados con evidencia verificable.
          </p>
          <form className="hero-search-card" onSubmit={submitHeroSearch}>
            <div className="hero-search-field">
              <span className="hero-search-label">¿Qué servicio necesitás?</span>
              <button
                className="hero-select-trigger"
                type="button"
                aria-expanded={openDropdown === "service"}
                onClick={() => setOpenDropdown(openDropdown === "service" ? null : "service")}
              >
                <Search size={18} />
                <span>{selectedService}</span>
                <ChevronDown size={18} />
              </button>
              {openDropdown === "service" && (
                <div className="hero-select-menu">
                  {serviceChoices.map((choice) => (
                    <button
                      className={choice.label === selectedService ? "hero-select-option selected" : "hero-select-option"}
                      type="button"
                      key={choice.label}
                      onClick={() => {
                        setSelectedService(choice.label);
                        setOpenDropdown(null);
                      }}
                    >
                      {choice.icon}
                      <span>{choice.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="hero-search-field">
              <span className="hero-search-label">¿En qué zona?</span>
              <button
                className="hero-select-trigger"
                type="button"
                aria-expanded={openDropdown === "zone"}
                onClick={() => setOpenDropdown(openDropdown === "zone" ? null : "zone")}
              >
                <MapPin size={18} />
                <span>{selectedZone || "Seleccionar zona"}</span>
                <ChevronDown size={18} />
              </button>
              {openDropdown === "zone" && (
                <div className="hero-select-menu">
                  {zoneChoices.map((zone) => (
                    <button
                      className={zone === selectedZone ? "hero-select-option selected" : "hero-select-option"}
                      type="button"
                      key={zone}
                      onClick={() => {
                        setSelectedZone(zone);
                        setOpenDropdown(null);
                      }}
                    >
                      <MapPin size={17} />
                      <span>{zone}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button className="button primary hero-search-submit" type="submit">
              Buscar servicios
              <ArrowRight size={17} />
            </button>
          </form>
        </div>
        <div className="hero-media">
          <img src={heroEvidence} alt="Técnico documentando una reparación para evidencia verificable" />
          <div className="console-panel">
            <div className="console-topline">
              <div className="console-title">Pérdida bajo cocina</div>
              <span className="status-dot verified">verificado</span>
            </div>
            <div className="console-row">
              <ShieldCheck size={16} />
              <span>2 evidencias con hash SHA-256</span>
            </div>
            <div className="console-row">
              <Bot size={16} />
              <span>IA: reparación finalizada sin pérdida visible</span>
            </div>
          </div>
        </div>
      </section>

      <section className="metric-strip">
        <Metric label="Trabajos demo" value={jobs.length.toString()} />
        <Metric label="Cierres completos" value={completed.toString()} />
        <Metric label="Evidencias verificadas" value={verifiedEvidence.toString()} />
        <Metric label="Red objetivo" value="Braga" />
      </section>

      <section
        className="promo-marquee"
        aria-label="Promoción de bienvenida"
        onMouseMove={movePromoMarquee}
        onMouseLeave={resetPromoMarquee}
      >
        <div className="promo-marquee-track">
          <div className="promo-copy">
            <span>Promo de bienvenida</span>
            <h2>20% OFF en tu primer servicio</h2>
            <p>Solo para nuevos usuarios</p>
          </div>
          <a className="promo-action" href="/services" onClick={linkTo("/services")}>
            Aprovechá ahora
            <ArrowRight size={18} />
          </a>
        </div>
      </section>

      <CategoryShowcaseCarousel />

      <section className="section process-section">
        <div className="process-heading">
          <div>
            <span className="eyebrow">Ejemplo del funcionamiento</span>
            <h2>De pedir ayuda a cerrar el trabajo con evidencia visible.</h2>
          </div>
          <p>
            Un cliente cotidiano puede entender qué pasa en cada momento: solicita el servicio, el prestador documenta el
            avance y el cierre queda listo para revisar.
          </p>
        </div>
        <div className="process-grid">
          <ProcessStep
            image={processRequest}
            imageAlt="Cliente solicitando un servicio desde su cocina."
            icon={<Search size={18} />}
            step="Paso 1"
            title="Pedís el servicio"
            text="Elegís el rubro, la zona y abrís una solicitud con el problema explicado en lenguaje simple."
            meta="Solicitud creada"
          />
          <ProcessStep
            image={processEvidence}
            imageAlt="Prestador documentando una reparación de plomería bajo la cocina."
            icon={<Upload size={18} />}
            step="Paso 2"
            title="El prestador muestra el avance"
            text="Sube fotos del antes, el progreso y el resultado para que no dependas solo de mensajes sueltos."
            meta="Evidencia con hash"
          />
          <ProcessStep
            image={processReview}
            imageAlt="Cliente revisando la evidencia final de un servicio terminado."
            icon={<ShieldCheck size={18} />}
            step="Paso 3"
            title="Revisás y cerrás con confianza"
            text="La evidencia queda ordenada para comparar el trabajo realizado, aprobar el cierre y dejar reseña."
            meta="Cierre verificable"
          />
        </div>

        <div className="process-case">
          <div className="process-case-copy">
            <span className="eyebrow inverted">Caso recomendado</span>
            <h3>Plomería: pérdida bajo cocina</h3>
            <p>
              Sofía Ramírez contrata a Martín Acosta. El recorrido muestra qué se pidió, qué evidencia subió el
              prestador y qué quedó listo para auditar.
            </p>
            <a className="button light" href="/jobs/job_001" onClick={linkTo("/jobs/job_001")}>
              Ver detalle
              <ArrowRight size={17} />
            </a>
          </div>
          <div className="process-proof" aria-label="Resumen visual del caso de plomería">
            <div>
              <span>Servicio</span>
              <strong>Plomería</strong>
            </div>
            <div>
              <span>Evidencias</span>
              <strong>2 fotos</strong>
            </div>
            <div>
              <span>Revisión IA</span>
              <strong>Sin pérdida visible</strong>
            </div>
            <div>
              <span>Estado</span>
              <strong>Completado</strong>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function ProcessStep({
  image,
  imageAlt,
  icon,
  step,
  title,
  text,
  meta,
}: {
  image: string;
  imageAlt: string;
  icon: ReactNode;
  step: string;
  title: string;
  text: string;
  meta: string;
}) {
  return (
    <article className="process-card">
      <div className="process-image">
        <img src={image} alt={imageAlt} loading="lazy" />
        <span>{meta}</span>
      </div>
      <div className="process-card-body">
        <div className="process-step-mark">
          {icon}
          <span>{step}</span>
        </div>
        <h3>{title}</h3>
        <p>{text}</p>
      </div>
    </article>
  );
}

function CategoryShowcaseCarousel() {
  return (
    <section className="category-showcase-section" aria-label="Categorías de servicios">
      <div className="category-showcase">
        {categoryShowcaseColumns.map((categories, tileIndex) => (
          <article className={`category-tile tile-${tileIndex + 1}`} key={`category-tile-${tileIndex}`}>
            {categories.map((category, layerIndex) => (
              <div className={`category-tile-layer layer-${layerIndex + 1}`} key={`${category.key}-${layerIndex}`}>
                <img src={category.image} alt={category.imageAlt} loading="lazy" />
                <div className="category-tile-copy">
                  <span>Categoría</span>
                  <h3>{category.title}</h3>
                  <p>{category.description}</p>
                </div>
              </div>
            ))}
          </article>
        ))}
      </div>
    </section>
  );
}

function ServicesPage({ services }: { services: Service[] }) {
  const [category, setCategory] = useState("all");
  const categories = ["all", ...Array.from(new Set(services.map((service) => service.category)))];
  const visibleServices = category === "all" ? services : services.filter((service) => service.category === category);

  return (
    <main className="page">
      <PageTitle
        eyebrow="Servicios"
        title="Elegir una categoría para iniciar el trabajo verificable."
        text="Los datos usan los mismos ids y campos sembrados en Directus."
      />
      <div className="chip-row">
        {categories.map((item) => (
          <button
            className={item === category ? "filter-chip active" : "filter-chip"}
            key={item}
            onClick={() => setCategory(item)}
          >
            {item === "all" ? "Todos" : categoryLabels[item] ?? item}
          </button>
        ))}
      </div>
      <div className="service-grid">
        {visibleServices.map((service) => (
          <article className="service-card" key={service.id}>
            <div className="service-icon">{serviceIcon(service.icon)}</div>
            <span className="eyebrow">{categoryLabels[service.category] ?? service.category}</span>
            <h2>{service.name}</h2>
            <p>{service.description}</p>
            <div className="card-footer">
              <span>{formatCurrency(service.basePrice ?? 0)}</span>
              <a href={`/services/${service.id}/providers`} onClick={linkTo(`/services/${service.id}/providers`)}>
                Ver prestadores
                <ArrowRight size={16} />
              </a>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}

function ProvidersPage({
  serviceId,
  services,
  providerProfiles,
}: {
  serviceId: string;
  services: Service[];
  providerProfiles: ProviderProfile[];
}) {
  const service = services.find((item) => item.id === serviceId);
  const providers = service
    ? providerProfiles.filter((profile) => profile.serviceCategories.includes(serviceSlug(service)))
    : providerProfiles;

  if (!service) return <NotFoundPage />;

  return (
    <main className="page">
      <PageTitle
        eyebrow={service.name}
        title="Prestadores disponibles con historial verificable."
        text={service.description ?? ""}
      />
      <div className="provider-list">
        {providers.map((profile) => (
          <ProviderRow key={profile.id} profile={profile} service={service} />
        ))}
      </div>
    </main>
  );
}

function ProviderRow({ profile, service }: { profile: ProviderProfile; service: Service }) {
  return (
    <article className="provider-row">
      <Avatar name={profile.user.name} />
      <div>
        <h2>{profile.user.name}</h2>
        <p>{profile.bio}</p>
        <div className="mini-meta">
          <span>
            <Star size={14} />
            {profile.ratingAverage}
          </span>
          <span>{profile.verifiedJobsCount} trabajos verificados</span>
          <span>{profile.experienceYears} años</span>
        </div>
      </div>
      <div className="row-actions">
        <a href={`/providers/${profile.user.id}`} onClick={linkTo(`/providers/${profile.user.id}`)}>
          Perfil
        </a>
        <a
          className="button primary compact"
          href={`/jobs/new?serviceId=${service.id}&providerId=${profile.user.id}`}
          onClick={linkTo(`/jobs/new?serviceId=${service.id}&providerId=${profile.user.id}`)}
        >
          Solicitar
          <ArrowRight size={15} />
        </a>
      </div>
    </article>
  );
}

function ProviderProfilePage({ providerId, context }: { providerId: string; context: AppContext }) {
  const profile = context.providerProfiles.find((item) => item.user.id === providerId);
  if (!profile) return <NotFoundPage />;

  const providerJobs = context.jobs.filter((job) => job.providerId === providerId);
  const service =
    context.services.find((item) => profile.serviceCategories.includes(serviceSlug(item))) ?? context.services[0];
  const pastEvidence = context.evidence.filter((item) => providerJobs.some((job) => job.id === item.jobId));

  return (
    <main className="page">
      <section className="profile-hero">
        <Avatar name={profile.user.name} large />
        <div>
          <span className="eyebrow">Prestador verificado</span>
          <h1>{profile.user.name}</h1>
          <p>{profile.bio}</p>
          <div className="trust-line">
            <span>
              <Star size={16} />
              {profile.ratingAverage}
            </span>
            <span>{profile.verifiedJobsCount} trabajos con evidencia</span>
            <span>{profile.user.city}</span>
          </div>
        </div>
        <a
          className="button primary"
          href={`/jobs/new?serviceId=${service?.id ?? ""}&providerId=${profile.user.id}`}
          onClick={linkTo(`/jobs/new?serviceId=${service?.id ?? ""}&providerId=${profile.user.id}`)}
        >
          Solicitar trabajo
          <ArrowRight size={17} />
        </a>
      </section>

      <section className="split-section">
        <div>
          <h2>Historial resumido</h2>
          <div className="timeline-list">
            {providerJobs.map((job) => (
              <a className="timeline-row link-row" href={`/jobs/${job.id}`} onClick={linkTo(`/jobs/${job.id}`)} key={job.id}>
                <StatusIcon status={job.status} />
                <div>
                  <strong>{job.title}</strong>
                  <span>{statusLabels[job.status]}</span>
                </div>
              </a>
            ))}
          </div>
        </div>
        <div>
          <h2>Evidencia anterior</h2>
          <div className="evidence-stack">
            {pastEvidence.slice(0, 3).map((item) => (
              <EvidenceCard key={item.id} item={item} compact />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function NewJobPage({
  serviceId,
  providerId,
  context,
}: {
  serviceId: string | null;
  providerId: string | null;
  context: AppContext;
}) {
  const service = context.services.find((item) => item.id === serviceId) ?? context.services[0];
  const provider = context.providerProfiles.find((item) => item.user.id === providerId) ?? context.providerProfiles[0];
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSubmitting(true);
    setError(null);

    try {
      const state = await createJob({
        clientId: "client_001",
        providerId: String(form.get("providerId")),
        serviceId: String(form.get("serviceId")),
        title: String(form.get("title")),
        description: String(form.get("description")),
        addressArea: String(form.get("addressArea")),
        scheduledDate: String(form.get("scheduledDate")),
      });
      const createdJob = state.jobs[0];

      context.applyRemoteState(state);
      navigate(`/jobs/${createdJob.id}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo crear el trabajo.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="page narrow">
      <PageTitle
        eyebrow="Nueva solicitud"
        title="Convertir la decisión en un trabajo operativo."
        text="El primer estado será requested; la publicación job_created queda lista para etapa 8."
      />
      <form className="form-card" onSubmit={onSubmit}>
        <div className="form-grid">
          <label>
            Servicio
            <select name="serviceId" defaultValue={service?.id}>
              {context.services.map((item) => (
                <option value={item.id} key={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Prestador
            <select name="providerId" defaultValue={provider?.user.id}>
              {context.providerProfiles.map((item) => (
                <option value={item.user.id} key={item.user.id}>
                  {item.user.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Título
            <input name="title" defaultValue="Pérdida bajo cocina" required />
          </label>
          <label>
            Zona
            <input name="addressArea" defaultValue="Palermo" required />
          </label>
          <label>
            Fecha
            <input name="scheduledDate" type="datetime-local" defaultValue="2026-05-29T10:00" required />
          </label>
          <label className="wide">
            Descripción
            <textarea
              name="description"
              defaultValue="Reparación de pérdida de agua debajo de la cocina."
              required
            />
          </label>
        </div>
        <button className="button primary" type="submit" disabled={submitting}>
          {submitting ? "Publicando..." : "Crear trabajo"}
          <ArrowRight size={17} />
        </button>
        {error && <p className="form-error">{error}</p>}
      </form>
    </main>
  );
}

type AppContext = {
  users: User[];
  services: Service[];
  providerProfiles: ProviderProfile[];
  reviews: Review[];
  jobs: Job[];
  evidence: JobEvidence[];
  arkivEvents: ArkivEvent[];
  setJobs: Dispatch<SetStateAction<Job[]>>;
  setEvidence: Dispatch<SetStateAction<JobEvidence[]>>;
  setArkivEvents: Dispatch<SetStateAction<ArkivEvent[]>>;
  applyRemoteState: (state: RemoteState) => void;
  setSyncMessage: Dispatch<SetStateAction<string | null>>;
};

function JobDetailPage({ jobId, context }: { jobId: string; context: AppContext }) {
  const [busyAction, setBusyAction] = useState<JobStatus | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const job = context.jobs.find((item) => item.id === jobId);
  if (!job) return <NotFoundPage />;
  const selectedJob = job;

  const service = context.services.find((item) => item.id === selectedJob.serviceId);
  const client = findUser(context.users, selectedJob.clientId);
  const provider = findUser(context.users, selectedJob.providerId);
  const jobEvidence = context.evidence.filter((item) => item.jobId === selectedJob.id);
  const review = context.reviews.find((item) => item.jobId === selectedJob.id);

  async function updateStatus(status: JobStatus) {
    setBusyAction(status);
    setActionError(null);

    try {
      const state = await updateJobStatus(selectedJob.id, status);
      context.applyRemoteState(state);
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : "No se pudo actualizar el trabajo.");
    } finally {
      setBusyAction(null);
    }
  }

  async function attachAiReview() {
    await updateStatus("ai_reviewed");
  }

  async function completeJob() {
    await updateStatus("completed");
  }

  return (
    <main className="page">
      <section className="job-hero">
        <div>
          <span className="eyebrow">{service?.name ?? "Servicio"}</span>
          <h1>{selectedJob.title}</h1>
          <p>{selectedJob.description}</p>
          <div className="trust-line">
            <span>{client?.name}</span>
            <span>{provider?.name ?? "Sin prestador"}</span>
            <span>{job.addressArea ?? "Zona no indicada"}</span>
          </div>
        </div>
        <StatusPill status={job.status} />
      </section>

      <section className="job-actions">
        {job.status === "requested" && (
          <button className="button primary" onClick={() => void updateStatus("accepted")} disabled={Boolean(busyAction)}>
            {busyAction === "accepted" ? "Actualizando..." : "Aceptar trabajo"}
            <CheckCircle2 size={17} />
          </button>
        )}
        {job.status === "accepted" && (
          <button className="button primary" onClick={() => void updateStatus("in_progress")} disabled={Boolean(busyAction)}>
            {busyAction === "in_progress" ? "Actualizando..." : "Marcar en progreso"}
            <ArrowRight size={17} />
          </button>
        )}
        {job.status === "in_progress" && (
          <a
            className="button primary"
            href={`/provider/jobs/${selectedJob.id}/evidence/new`}
            onClick={linkTo(`/provider/jobs/${selectedJob.id}/evidence/new`)}
          >
            Subir evidencia
            <Upload size={17} />
          </a>
        )}
        {job.status === "evidence_uploaded" && (
          <button className="button primary" onClick={() => void attachAiReview()} disabled={Boolean(busyAction)}>
            {busyAction === "ai_reviewed" ? "Publicando..." : "Guardar revisión IA"}
            <Bot size={17} />
          </button>
        )}
        {job.status === "ai_reviewed" && (
          <button className="button primary" onClick={() => void completeJob()} disabled={Boolean(busyAction)}>
            {busyAction === "completed" ? "Publicando..." : "Aprobar cierre"}
            <CheckCircle2 size={17} />
          </button>
        )}
        <a className="button text" href="/admin" onClick={linkTo("/admin")}>
          Abrir auditoría
        </a>
        {actionError && <p className="form-error">{actionError}</p>}
      </section>

      <section className="split-section wide-left">
        <div>
          <h2>Timeline verificable</h2>
          <VerificationTimeline job={selectedJob} evidence={jobEvidence} arkivEvents={context.arkivEvents} />
        </div>
        <aside className="verification-panel">
          <h2>Verificación</h2>
          <KeyValue label="Entity key solicitud" value={selectedJob.arkivEntityKeyCreated} />
          <KeyValue label="Tx hash solicitud" value={selectedJob.arkivTxHashCreated} referenceKind="tx" />
          <KeyValue
            label="Fecha programada"
            value={selectedJob.scheduledDate ? formatDate(selectedJob.scheduledDate) : "Sin fecha"}
          />
        </aside>
      </section>

      <section className="section compact-section">
        <div className="section-heading">
          <span className="eyebrow">Evidencias</span>
          <h2>Archivo local, metadata, IA y Arkiv.</h2>
        </div>
        <div className="evidence-grid">
          {jobEvidence.length > 0 ? (
            jobEvidence.map((item) => <EvidenceCard item={item} key={item.id} />)
          ) : (
            <EmptyState text="Todavia no hay evidencia cargada para este trabajo." />
          )}
        </div>
      </section>

      <section className="dark-band">
        <div>
          <span className="eyebrow inverted">Resultado final</span>
          <h2>{review ? `${review.rating}/5 - ${review.comment}` : "Reseña pendiente"}</h2>
          <p>
            El cierre crea el evento job_completed y deja un historial consultable por jobId desde Directus.
          </p>
        </div>
        <StatusPill status={selectedJob.status} light />
      </section>
    </main>
  );
}

function VerificationTimeline({
  job,
  evidence,
  arkivEvents,
}: {
  job: Job;
  evidence: JobEvidence[];
  arkivEvents: ArkivEvent[];
}) {
  const hasEvidence = evidence.length > 0;
  const hasAi = evidence.some((item) => item.aiStatus !== "pending" && item.aiSummary);
  const completedEvent = arkivEvents.find((event) => event.localSubjectId === job.id && event.eventType === "job_completed");
  const latestEvidence = evidence[evidence.length - 1];
  const aiEvent = latestEvidence
    ? arkivEvents.find((event) => event.localSubjectId === latestEvidence.id && event.eventType === "ai_review_generated")
    : null;

  const rows = [
    {
      label: "Solicitud creada",
      local: "jobs",
      event: "job_created",
      done: statusOrder.indexOf(job.status) >= statusOrder.indexOf("requested"),
      entityKey: job.arkivEntityKeyCreated,
      txHash: job.arkivTxHashCreated,
    },
    {
      label: "Evidencia subida",
      local: "job_evidence + uploads/",
      event: "evidence_uploaded",
      done: hasEvidence,
      entityKey: latestEvidence?.arkivEntityKey ?? null,
      txHash: latestEvidence?.arkivTxHash ?? null,
    },
    {
      label: "Revisión IA generada",
      local: "job_evidence.ai_summary",
      event: "ai_review_generated",
      done: hasAi,
      entityKey: aiEvent?.entityKey ?? null,
      txHash: aiEvent?.txHash ?? null,
    },
    {
      label: "Trabajo completado",
      local: "jobs.status + reviews",
      event: "job_completed",
      done: job.status === "completed",
      entityKey: completedEvent?.entityKey ?? null,
      txHash: completedEvent?.txHash ?? null,
    },
  ];

  return (
    <div className="timeline-list">
      {rows.map((row) => (
        <div className="timeline-row" key={row.event}>
          {isArkivEntityKey(row.entityKey) ? (
            <CheckCircle2 className="ok" size={20} />
          ) : row.done ? (
            <Clock3 size={20} />
          ) : (
            <AlertTriangle size={20} />
          )}
          <div>
            <strong>{row.label}</strong>
            <span>{row.local}</span>
          </div>
          <div className="timeline-proof">
            <span>{row.event}</span>
            <ArkivReference value={row.entityKey} fallback="referencia local no publicada" />
            {isArkivTxHash(row.txHash) && <ArkivReference value={row.txHash} kind="tx" />}
          </div>
        </div>
      ))}
    </div>
  );
}

function ProviderDashboard({ context }: { context: AppContext }) {
  const assignedJobs = context.jobs.filter((job) => job.providerId === "provider_001" || job.status !== "completed");

  return (
    <main className="page">
      <PageTitle
        eyebrow="Panel prestador"
        title="Trabajos asignados y próximo paso recomendado."
        text="Las acciones modifican el estado real en Directus para recorrer el guion de demo."
      />
      <div className="work-table">
        {assignedJobs.map((job) => {
          const service = context.services.find((item) => item.id === job.serviceId);
          return (
            <article className="work-row" key={job.id}>
              <div>
                <span className="eyebrow">{service?.name}</span>
                <h2>{job.title}</h2>
                <p>{nextStep(job.status)}</p>
              </div>
              <StatusPill status={job.status} />
              <div className="row-actions">
                <a href={`/jobs/${job.id}`} onClick={linkTo(`/jobs/${job.id}`)}>
                  Abrir
                </a>
                {job.status === "in_progress" && (
                  <a
                    className="button primary compact"
                    href={`/provider/jobs/${job.id}/evidence/new`}
                    onClick={linkTo(`/provider/jobs/${job.id}/evidence/new`)}
                  >
                    Evidencia
                    <Upload size={15} />
                  </a>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </main>
  );
}

function nextStep(status: JobStatus) {
  const steps: Record<JobStatus, string> = {
    requested: "Aceptar solicitud",
    accepted: "Marcar en progreso",
    in_progress: "Subir evidencia before, progress o after",
    evidence_uploaded: "Esperar revisión IA",
    ai_reviewed: "Esperar aprobación del cliente",
    completed: "Trabajo cerrado",
  };
  return steps[status];
}

function NewEvidencePage({ jobId, context }: { jobId: string; context: AppContext }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const job = context.jobs.find((item) => item.id === jobId);
  if (!job) return <NotFoundPage />;
  const selectedJob = job;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const file = form.get("file");
    setSubmitting(true);
    setError(null);

    if (!(file instanceof File) || file.size === 0) {
      setSubmitting(false);
      setError("Selecciona una imagen para guardar la evidencia.");
      return;
    }

    try {
      const payload = new FormData();
      payload.set("uploadedBy", selectedJob.providerId ?? "provider_001");
      payload.set("type", String(form.get("type")) as EvidenceType);
      payload.set("description", String(form.get("description")));
      payload.set("file", file);
      const state = await createEvidence(selectedJob.id, payload);

      context.applyRemoteState(state);
      navigate(`/jobs/${selectedJob.id}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo guardar la evidencia.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="page narrow">
      <PageTitle
        eyebrow="Subir evidencia"
        title={selectedJob.title}
        text="El archivo se guarda con hash SHA-256 y metadata listos para publicar evidence_uploaded."
      />
      <form className="form-card" onSubmit={onSubmit}>
        <div className="form-grid">
          <label>
            Tipo
            <select name="type" defaultValue="after">
              <option value="before">before</option>
              <option value="progress">progress</option>
              <option value="after">after</option>
              <option value="receipt">receipt</option>
              <option value="issue">issue</option>
            </select>
          </label>
          <label>
            Archivo local
            <input name="file" type="file" accept="image/*" required />
          </label>
          <label className="wide">
            Descripción
            <textarea name="description" defaultValue="Reparación terminada sin pérdida visible." />
          </label>
        </div>
        <button className="button primary" type="submit" disabled={submitting}>
          {submitting ? "Publicando..." : "Guardar evidencia"}
          <Upload size={17} />
        </button>
        {error && <p className="form-error">{error}</p>}
      </form>
    </main>
  );
}

function AdminPage({
  jobs,
  evidence,
  arkivEvents,
}: {
  jobs: Job[];
  evidence: JobEvidence[];
  arkivEvents: ArkivEvent[];
}) {
  return (
    <main className="page">
      <PageTitle
        eyebrow="Admin / jurado"
        title="Auditoria operativa y verificable en una sola vista."
        text="Compara estados locales, evidencias, IA y referencias Arkiv por trabajo."
      />
      <div className="admin-grid">
        {jobs.map((job) => {
          const jobEvidence = evidence.filter((item) => item.jobId === job.id);
          const jobEvents = arkivEvents.filter(
            (event) =>
              event.localSubjectId === job.id || jobEvidence.some((item) => item.id === event.localSubjectId),
          );
          const verifiableEvents = jobEvents.filter(
            (event) => isArkivEntityKey(event.entityKey) || isArkivTxHash(event.txHash),
          );
          const alert = jobEvidence.some((item) => item.aiStatus === "warning" || item.aiStatus === "rejected");

          return (
            <article className="admin-card" key={job.id}>
              <div className="admin-card-head">
                <div>
                  <span className="eyebrow">{job.id}</span>
                  <h2>{job.title}</h2>
                </div>
                <StatusPill status={job.status} />
              </div>
              <div className="admin-metrics">
                <Metric label="Evidencias" value={jobEvidence.length.toString()} />
                <Metric label="Links Arkiv" value={`${verifiableEvents.length}/${jobEvents.length}`} />
                <Metric label="IA" value={alert ? "Alerta" : "OK"} />
              </div>
              <div className="proof-list">
                {jobEvents.length > 0 ? (
                  jobEvents.map((event) => {
                    const entityHref = isArkivEntityKey(event.entityKey) ? arkivEntityUrl(event.entityKey) : null;
                    const txHref = isArkivTxHash(event.txHash) ? arkivTxUrl(event.txHash) : null;
                    const href = entityHref ?? txHref;

                    return href ? (
                      <a href={href} target="_blank" rel="noreferrer" key={event.id}>
                        <Database size={15} />
                        <span>{event.eventType}</span>
                        <code title={entityHref ? event.entityKey : event.txHash}>
                          {compactArkivId(entityHref ? event.entityKey : event.txHash)}
                        </code>
                        <ExternalLink size={14} />
                      </a>
                    ) : (
                      <span className="pending-proof" key={event.id}>
                        <Clock3 size={15} />
                        <span>{event.eventType}</span>
                        <code>referencia local no publicada</code>
                      </span>
                    );
                  })
                ) : (
                  <span className="pending-proof">Sin eventos publicados</span>
                )}
              </div>
              <a className="button text" href={`/jobs/${job.id}`} onClick={linkTo(`/jobs/${job.id}`)}>
                Abrir detalle
              </a>
            </article>
          );
        })}
      </div>
    </main>
  );
}

function PageTitle({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return (
    <section className="page-title">
      <span className="eyebrow">{eyebrow}</span>
      <h1>{title}</h1>
      <p>{text}</p>
    </section>
  );
}

function StatusPill({ status, light = false }: { status: JobStatus; light?: boolean }) {
  return <span className={light ? `status-pill light ${status}` : `status-pill ${status}`}>{statusLabels[status]}</span>;
}

function StatusIcon({ status }: { status: JobStatus }) {
  if (status === "completed" || status === "ai_reviewed") return <CheckCircle2 className="ok" size={20} />;
  if (status === "evidence_uploaded" || status === "in_progress") return <Clock3 size={20} />;
  return <AlertTriangle size={20} />;
}

function resolveEvidenceImageUrl(value: string | null) {
  if (!value) return null;
  if (/^(https?:|data:|blob:)/i.test(value)) return value;

  const directusUrl = import.meta.env.VITE_DIRECTUS_URL?.trim().replace(/\/$/, "");
  if (directusUrl && value.startsWith("/assets/")) {
    return `${directusUrl}${value}`;
  }

  return value;
}

function EvidenceCard({ item, compact = false }: { item: JobEvidence; compact?: boolean }) {
  const imageUrl = resolveEvidenceImageUrl(item.publicFileUrl);

  return (
    <article className={compact ? "evidence-card compact" : "evidence-card"}>
      <div className="evidence-preview">
        {imageUrl ? (
          <img src={imageUrl} alt={item.description ?? `Evidencia ${item.type}`} loading="lazy" />
        ) : (
          <FileText size={22} />
        )}
        <span>{item.type}</span>
      </div>
      <div>
        <h3>{item.description}</h3>
        <p>{item.aiSummary ?? "Análisis IA pendiente."}</p>
        <div className="hash-line">
          <span>SHA-256</span>
          <code>{item.sha256Hash}</code>
        </div>
        <div className="proof-state">
          {item.arkivEntityKey ? <CheckCircle2 size={16} /> : <Clock3 size={16} />}
          {item.arkivEntityKey ? (
            <ArkivReference value={item.arkivEntityKey} />
          ) : (
            <span>Pendiente de publicación en Arkiv</span>
          )}
        </div>
      </div>
    </article>
  );
}

function KeyValue({
  label,
  value,
  referenceKind = "entity",
}: {
  label: string;
  value: string | null;
  referenceKind?: ArkivReferenceKind;
}) {
  return (
    <div className="key-value">
      <span>{label}</span>
      <ArkivReference value={value} kind={referenceKind} fallback={value ?? "Pendiente de publicación"} />
    </div>
  );
}

function Avatar({ name, large = false }: { name: string; large?: boolean }) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2);

  return <div className={large ? "avatar large" : "avatar"}>{initials}</div>;
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="empty-state">
      <Clock3 size={20} />
      <span>{text}</span>
    </div>
  );
}

function NotFoundPage() {
  return (
    <main className="page narrow">
      <PageTitle eyebrow="404" title="No encontramos esa pantalla." text="Volver al inicio de la demo." />
      <a className="button primary" href="/" onClick={linkTo("/")}>
        Inicio
        <ArrowRight size={17} />
      </a>
    </main>
  );
}

export default App;
