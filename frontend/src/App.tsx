import {
  AlertTriangle,
  ArrowRight,
  Bot,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  Database,
  ExternalLink,
  FileText,
  Hammer,
  Home,
  LayoutDashboard,
  Menu,
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
import heroEvidence from "./assets/hero-evidence.png";
import {
  arkivEvents as initialArkivEvents,
  evidence as initialEvidence,
  jobs as initialJobs,
  providerProfiles,
  reviews,
  services,
  users,
} from "./data";
import type { ArkivEvent, EvidenceType, Job, JobEvidence, JobStatus, Service } from "./types";

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
  in_progress: "En ejecucion",
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

function serviceIcon(icon: string) {
  const icons: Record<string, ReactNode> = {
    wrench: <Wrench size={20} />,
    sprout: <Sprout size={20} />,
    bolt: <Zap size={20} />,
    sparkles: <Sparkles size={20} />,
    hammer: <Hammer size={20} />,
    settings: <Settings size={20} />,
  };

  return icons[icon] ?? <BriefcaseBusiness size={20} />;
}

function findUser(id: string | null) {
  return users.find((user) => user.id === id) ?? null;
}

function serviceSlug(service: Service) {
  return service.name.toLowerCase();
}

function App() {
  const route = useRoute();
  const [menuOpen, setMenuOpen] = useState(false);
  const [jobs, setJobs] = useState<Job[]>(initialJobs);
  const [evidence, setEvidence] = useState<JobEvidence[]>(initialEvidence);
  const [arkivEvents, setArkivEvents] = useState<ArkivEvent[]>(initialArkivEvents);

  const context = useMemo(
    () => ({ jobs, evidence, arkivEvents, setJobs, setEvidence, setArkivEvents }),
    [jobs, evidence, arkivEvents],
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

      {route.name === "home" && <HomePage jobs={jobs} evidence={evidence} />}
      {route.name === "services" && <ServicesPage />}
      {route.name === "serviceProviders" && <ProvidersPage serviceId={route.serviceId} />}
      {route.name === "providerProfile" && <ProviderProfilePage providerId={route.providerId} jobs={jobs} evidence={evidence} />}
      {route.name === "newJob" && (
        <NewJobPage serviceId={route.serviceId} providerId={route.providerId} jobs={jobs} setJobs={setJobs} />
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
      <span>Evidencia local, analisis IA y eventos verificables en Arkiv Braga.</span>
      <a href="/admin" onClick={linkTo("/admin")}>
        Auditar demo
      </a>
    </div>
  );
}

function HomePage({ jobs, evidence }: { jobs: Job[]; evidence: JobEvidence[] }) {
  const completed = jobs.filter((job) => job.status === "completed").length;
  const verifiedEvidence = evidence.filter((item) => item.arkivEntityKey).length;

  return (
    <main>
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">Marketplace local con reputacion verificable</span>
          <h1>Servicios con evidencia que se puede auditar.</h1>
          <p>
            Clientes y prestadores siguen el trabajo desde la solicitud hasta el cierre, con fotos, resumen IA y eventos
            publicados como historial confiable.
          </p>
          <div className="hero-actions">
            <a className="button primary" href="/services" onClick={linkTo("/services")}>
              Buscar servicios
              <ArrowRight size={17} />
            </a>
            <a className="button text" href="/provider" onClick={linkTo("/provider")}>
              Panel prestador
            </a>
          </div>
        </div>
        <div className="hero-media">
          <img src={heroEvidence} alt="Tecnico documentando una reparacion para evidencia verificable" />
          <div className="console-panel">
            <div className="console-topline">
              <span>job_001</span>
              <span className="status-dot verified">verificado</span>
            </div>
            <div className="console-title">Perdida bajo cocina</div>
            <div className="console-row">
              <ShieldCheck size={16} />
              <span>2 evidencias con hash SHA-256</span>
            </div>
            <div className="console-row">
              <Bot size={16} />
              <span>IA: reparacion finalizada sin perdida visible</span>
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

      <section className="section">
        <div className="section-heading">
          <span className="eyebrow">Flujo principal</span>
          <h2>Un recorrido claro para cliente, prestador y jurado.</h2>
        </div>
        <div className="feature-grid">
          <Feature icon={<Search />} title="Cliente" text="Elige servicio, revisa reputacion y abre una solicitud con estado visible." />
          <Feature icon={<Upload />} title="Prestador" text="Acepta el trabajo, marca avance y sube evidencia local con hash." />
          <Feature icon={<Database />} title="Admin" text="Audita SQLite contra Arkiv: entity keys, tx hashes, IA y alertas." />
        </div>
      </section>

      <section className="dark-band">
        <div>
          <span className="eyebrow inverted">Caso recomendado</span>
          <h2>Plomeria: perdida bajo cocina.</h2>
          <p>
            Sofia Ramirez contrata a Martin Acosta. El trabajo avanza por estados operativos y cada hito importante se
            muestra como pendiente o verificable.
          </p>
        </div>
        <a className="button light" href="/jobs/job_001" onClick={linkTo("/jobs/job_001")}>
          Ver detalle
          <ArrowRight size={17} />
        </a>
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

function Feature({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <article className="feature-card">
      <div className="feature-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{text}</p>
    </article>
  );
}

function ServicesPage() {
  const [category, setCategory] = useState("all");
  const categories = ["all", ...Array.from(new Set(services.map((service) => service.category)))];
  const visibleServices = category === "all" ? services : services.filter((service) => service.category === category);

  return (
    <main className="page">
      <PageTitle
        eyebrow="Servicios"
        title="Elegir una categoria para iniciar el trabajo verificable."
        text="Los datos usan los mismos ids y campos que el seed local del backend."
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
              <span>{formatCurrency(service.basePrice)}</span>
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

function ProvidersPage({ serviceId }: { serviceId: string }) {
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
        text={service.description}
      />
      <div className="provider-list">
        {providers.map((profile) => (
          <ProviderRow key={profile.id} profile={profile} service={service} />
        ))}
      </div>
    </main>
  );
}

function ProviderRow({ profile, service }: { profile: (typeof providerProfiles)[number]; service: Service }) {
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
          <span>{profile.experienceYears} anos</span>
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

function ProviderProfilePage({
  providerId,
  jobs,
  evidence,
}: {
  providerId: string;
  jobs: Job[];
  evidence: JobEvidence[];
}) {
  const profile = providerProfiles.find((item) => item.user.id === providerId);
  if (!profile) return <NotFoundPage />;

  const providerJobs = jobs.filter((job) => job.providerId === providerId);
  const service = services.find((item) => profile.serviceCategories.includes(serviceSlug(item))) ?? services[0];
  const pastEvidence = evidence.filter((item) => providerJobs.some((job) => job.id === item.jobId));

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
          href={`/jobs/new?serviceId=${service.id}&providerId=${profile.user.id}`}
          onClick={linkTo(`/jobs/new?serviceId=${service.id}&providerId=${profile.user.id}`)}
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
  jobs,
  setJobs,
}: {
  serviceId: string | null;
  providerId: string | null;
  jobs: Job[];
  setJobs: React.Dispatch<React.SetStateAction<Job[]>>;
}) {
  const service = services.find((item) => item.id === serviceId) ?? services[0];
  const provider = providerProfiles.find((item) => item.user.id === providerId) ?? providerProfiles[0];

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const id = `job_${String(jobs.length + 1).padStart(3, "0")}`;
    const now = new Date().toISOString();
    const job: Job = {
      id,
      clientId: "client_001",
      providerId: String(form.get("providerId")),
      serviceId: String(form.get("serviceId")),
      title: String(form.get("title")),
      description: String(form.get("description")),
      status: "requested",
      addressArea: String(form.get("addressArea")),
      scheduledDate: String(form.get("scheduledDate")),
      createdAt: now,
      updatedAt: now,
      arkivEntityKeyCreated: null,
      arkivTxHashCreated: null,
    };

    setJobs((current) => [job, ...current]);
    navigate(`/jobs/${id}`);
  }

  return (
    <main className="page narrow">
      <PageTitle
        eyebrow="Nueva solicitud"
        title="Convertir la decision en un trabajo operativo."
        text="El primer estado sera requested; la publicacion job_created queda lista para etapa 8."
      />
      <form className="form-card" onSubmit={onSubmit}>
        <div className="form-grid">
          <label>
            Servicio
            <select name="serviceId" defaultValue={service.id}>
              {services.map((item) => (
                <option value={item.id} key={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Prestador
            <select name="providerId" defaultValue={provider.user.id}>
              {providerProfiles.map((item) => (
                <option value={item.user.id} key={item.user.id}>
                  {item.user.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Titulo
            <input name="title" defaultValue="Perdida bajo cocina" required />
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
            Descripcion
            <textarea
              name="description"
              defaultValue="Reparacion de perdida de agua debajo de la cocina."
              required
            />
          </label>
        </div>
        <button className="button primary" type="submit">
          Crear trabajo
          <ArrowRight size={17} />
        </button>
      </form>
    </main>
  );
}

type AppContext = {
  jobs: Job[];
  evidence: JobEvidence[];
  arkivEvents: ArkivEvent[];
  setJobs: Dispatch<SetStateAction<Job[]>>;
  setEvidence: Dispatch<SetStateAction<JobEvidence[]>>;
  setArkivEvents: Dispatch<SetStateAction<ArkivEvent[]>>;
};

function JobDetailPage({ jobId, context }: { jobId: string; context: AppContext }) {
  const job = context.jobs.find((item) => item.id === jobId);
  if (!job) return <NotFoundPage />;
  const selectedJob = job;

  const service = services.find((item) => item.id === selectedJob.serviceId);
  const client = findUser(selectedJob.clientId);
  const provider = findUser(selectedJob.providerId);
  const jobEvidence = context.evidence.filter((item) => item.jobId === selectedJob.id);
  const review = reviews.find((item) => item.jobId === selectedJob.id);

  function updateStatus(status: JobStatus) {
    context.setJobs((current) =>
      current.map((item) => (item.id === selectedJob.id ? { ...item, status, updatedAt: new Date().toISOString() } : item)),
    );
  }

  function attachAiReview() {
    const target = jobEvidence[0];
    if (!target) return;
    context.setEvidence((current) =>
      current.map((item) =>
        item.id === target.id
          ? {
              ...item,
              aiStatus: "valid",
              aiSummary: "La evidencia parece consistente con el servicio y no muestra alertas criticas.",
            }
          : item,
      ),
    );
    context.setArkivEvents((current) => [
      ...current,
      {
        id: `arkiv_${current.length + 1}`,
        localSubjectType: "evidence",
        localSubjectId: target.id,
        eventType: "ai_review_generated",
        entityKey: `braga:ai-review:${target.id}`,
        txHash: `0xa1${Date.now().toString(16)}`,
        createdAt: new Date().toISOString(),
      },
    ]);
    updateStatus("ai_reviewed");
  }

  function completeJob() {
    context.setArkivEvents((current) => [
      ...current,
      {
        id: `arkiv_${current.length + 1}`,
        localSubjectType: "job",
        localSubjectId: selectedJob.id,
        eventType: "job_completed",
        entityKey: `braga:job-completed:${selectedJob.id}`,
        txHash: `0xb8${Date.now().toString(16)}`,
        createdAt: new Date().toISOString(),
      },
    ]);
    updateStatus("completed");
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
            <span>{job.addressArea}</span>
          </div>
        </div>
        <StatusPill status={job.status} />
      </section>

      <section className="job-actions">
        {job.status === "requested" && (
          <button className="button primary" onClick={() => updateStatus("accepted")}>
            Aceptar trabajo
            <CheckCircle2 size={17} />
          </button>
        )}
        {job.status === "accepted" && (
          <button className="button primary" onClick={() => updateStatus("in_progress")}>
            Marcar en progreso
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
          <button className="button primary" onClick={attachAiReview}>
            Guardar revision IA
            <Bot size={17} />
          </button>
        )}
        {job.status === "ai_reviewed" && (
          <button className="button primary" onClick={completeJob}>
            Aprobar cierre
            <CheckCircle2 size={17} />
          </button>
        )}
        <a className="button text" href="/admin" onClick={linkTo("/admin")}>
          Abrir auditoria
        </a>
      </section>

      <section className="split-section wide-left">
        <div>
          <h2>Timeline verificable</h2>
          <VerificationTimeline job={selectedJob} evidence={jobEvidence} arkivEvents={context.arkivEvents} />
        </div>
        <aside className="verification-panel">
          <h2>Verificacion</h2>
          <KeyValue label="Entity key solicitud" value={selectedJob.arkivEntityKeyCreated ?? "Pendiente de publicacion"} />
          <KeyValue label="Tx hash solicitud" value={selectedJob.arkivTxHashCreated ?? "Pendiente de publicacion"} />
          <KeyValue label="Fecha programada" value={formatDate(selectedJob.scheduledDate)} />
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
          <h2>{review ? `${review.rating}/5 - ${review.comment}` : "Resena pendiente"}</h2>
          <p>
            El cierre crea el evento job_completed y deja un historial consultable por jobId cuando se conecte la etapa
            8.
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
      label: "Revision IA generada",
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
          {row.entityKey ? <CheckCircle2 className="ok" size={20} /> : row.done ? <Clock3 size={20} /> : <AlertTriangle size={20} />}
          <div>
            <strong>{row.label}</strong>
            <span>{row.local}</span>
          </div>
          <div className="timeline-proof">
            <span>{row.event}</span>
            <code>{row.entityKey ?? "pendiente"}</code>
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
        title="Trabajos asignados y proximo paso recomendado."
        text="Las acciones modifican el estado local para recorrer el guion de demo."
      />
      <div className="work-table">
        {assignedJobs.map((job) => {
          const service = services.find((item) => item.id === job.serviceId);
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
    evidence_uploaded: "Esperar revision IA",
    ai_reviewed: "Esperar aprobacion del cliente",
    completed: "Trabajo cerrado",
  };
  return steps[status];
}

function NewEvidencePage({ jobId, context }: { jobId: string; context: AppContext }) {
  const job = context.jobs.find((item) => item.id === jobId);
  if (!job) return <NotFoundPage />;
  const selectedJob = job;

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const id = `evidence_${String(context.evidence.length + 1).padStart(3, "0")}`;
    const fileName = String((form.get("file") as File)?.name || `${selectedJob.id}_after.jpg`);
    const now = new Date().toISOString();
    const newEvidence: JobEvidence = {
      id,
      jobId: selectedJob.id,
      uploadedBy: selectedJob.providerId ?? "provider_001",
      type: String(form.get("type")) as EvidenceType,
      localFilePath: `uploads/${fileName}`,
      publicFileUrl: `/uploads/${fileName}`,
      description: String(form.get("description")),
      sha256Hash: `demo-${Date.now().toString(16)}-${selectedJob.id}`,
      aiSummary: null,
      aiStatus: "pending",
      arkivEntityKey: null,
      arkivTxHash: null,
      createdAt: now,
    };

    context.setEvidence((current) => [...current, newEvidence]);
    context.setJobs((current) =>
      current.map((item) =>
        item.id === selectedJob.id ? { ...item, status: "evidence_uploaded", updatedAt: now } : item,
      ),
    );
    navigate(`/jobs/${selectedJob.id}`);
  }

  return (
    <main className="page narrow">
      <PageTitle
        eyebrow="Subir evidencia"
        title={selectedJob.title}
        text="El archivo queda representado como uploads/, con hash y metadata listos para publicar evidence_uploaded."
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
            <input name="file" type="file" />
          </label>
          <label className="wide">
            Descripcion
            <textarea name="description" defaultValue="Reparacion terminada sin perdida visible." />
          </label>
        </div>
        <button className="button primary" type="submit">
          Guardar evidencia
          <Upload size={17} />
        </button>
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
                <Metric label="Eventos Arkiv" value={jobEvents.length.toString()} />
                <Metric label="IA" value={alert ? "Alerta" : "OK"} />
              </div>
              <div className="proof-list">
                {jobEvents.length > 0 ? (
                  jobEvents.map((event) => (
                    <a
                      href={`https://data.arkiv.network/entities/${event.entityKey}`}
                      target="_blank"
                      rel="noreferrer"
                      key={event.id}
                    >
                      <Database size={15} />
                      <span>{event.eventType}</span>
                      <code>{event.entityKey}</code>
                      <ExternalLink size={14} />
                    </a>
                  ))
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

function EvidenceCard({ item, compact = false }: { item: JobEvidence; compact?: boolean }) {
  return (
    <article className={compact ? "evidence-card compact" : "evidence-card"}>
      <div className="evidence-preview">
        <FileText size={22} />
        <span>{item.type}</span>
      </div>
      <div>
        <h3>{item.description}</h3>
        <p>{item.aiSummary ?? "Analisis IA pendiente."}</p>
        <div className="hash-line">
          <span>SHA-256</span>
          <code>{item.sha256Hash}</code>
        </div>
        <div className="proof-state">
          {item.arkivEntityKey ? <CheckCircle2 size={16} /> : <Clock3 size={16} />}
          <span>{item.arkivEntityKey ?? "Pendiente de publicacion en Arkiv"}</span>
        </div>
      </div>
    </article>
  );
}

function KeyValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="key-value">
      <span>{label}</span>
      <code>{value}</code>
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
