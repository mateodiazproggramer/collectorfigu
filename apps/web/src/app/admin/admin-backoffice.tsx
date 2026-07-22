'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowUp,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Download,
  Edit3,
  FileText,
  Image as ImageIcon,
  Loader2,
  LogOut,
  Mail,
  MapPin,
  PackagePlus,
  Phone,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings,
  ShieldCheck,
  Star,
  Tag,
  Trash2,
  TrendingUp,
  Upload,
  User,
  X,
} from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { LimitedEditionBadge } from '@/components/limited-edition-badge';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';
const TOKEN_KEY = 'collectorfigu_admin_token';

const orderStatuses = ['PENDING', 'PAID', 'PREPARING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
const productStatuses = ['ACTIVE', 'DRAFT', 'INACTIVE'];
const MAX_FEATURED_PRODUCTS = 16;

type Dashboard = {
  salesDay: number | string;
  salesMonth: number | string;
  pendingOrders: number;
  lowInventory: number;
};

type AdminUser = { id: string; email: string; firstName?: string; roles: string[] };
type Option = { id: string; name: string; slug: string };
type ProductImage = { id: string; url: string; publicId: string; alt?: string | null; sortOrder: number; isMain: boolean; variantId?: string | null };

type Product = {
  id: string;
  sku: string;
  slug: string;
  name: string;
  character?: string | null;
  presentation?: string | null;
  pieces?: number | null;
  isLimitedEdition?: boolean;
  description: string;
  specifications?: Record<string, unknown>;
  price: number | string;
  previousPrice?: number | string | null;
  status: string;
  color?: string | null;
  isFeatured?: boolean;
  brandId: string;
  categoryId: string;
  brand?: Option;
  category?: Option;
  inventory?: { stock: number; reserved: number; lowStockThreshold: number };
  variants?: ProductVariant[];
  images?: ProductImage[];
};

type ProductVariant = {
  id: string;
  sku?: string | null;
  colorName: string;
  colorHex: string;
  stock: number;
  reserved: number;
  lowStockThreshold: number;
  sortOrder: number;
  isActive: boolean;
  images?: ProductImage[];
};

type Order = {
  id: string;
  orderNumber: string;
  status: string;
  paymentMethod?: string;
  subtotal?: number | string;
  discountTotal?: number | string;
  shippingTotal?: number | string;
  grandTotal: number | string;
  notes?: string | null;
  createdAt: string;
  user?: { email: string; firstName?: string; lastName?: string };
  items?: Array<{ id: string; nameSnapshot: string; variantSnapshot?: string | null; quantity: number; unitPrice?: number | string; totalPrice?: number | string }>;
  payments?: Array<{ id: string; method: string; status: string; provider?: string | null; providerRef?: string | null }>;
  shippingAddress?: { firstName?: string; lastName?: string; document?: string; city: string; department: string; addressLine1: string; addressLine2?: string | null; phone: string };
  coupon?: { code: string } | null;
};

type ProductReview = {
  id: string;
  productId: string;
  name: string;
  city?: string | null;
  rating: number;
  title?: string | null;
  comment: string;
  status: string;
  createdAt: string;
  product?: { id: string; name: string; slug: string; sku: string };
};

type AnalyticsSummary = {
  days: number;
  total: number;
  byEvent: Array<{ event: string; count: number }>;
  keyEvents: Array<{ event: string; count: number }>;
  topProducts: Array<{ productId?: string | null; count: number; product?: { id: string; name: string; slug: string } | null }>;
  recent: Array<{ id: string; event: string; path?: string | null; productId?: string | null; metadata?: Record<string, unknown> | null; createdAt: string }>;
};

type ImportPreview = {
  mode: 'preview' | 'commit';
  summary: { rows: number; products: number; variants: number; imageCount: number; errors: number; warnings: number };
  errors: Array<{ line: number; message: string }>;
  warnings: Array<{ line: number; message: string }>;
  rows?: Array<{ line: number; sku: string; name: string; brandName: string; colorName?: string; stock: number; imageUrls: string[] }>;
  result?: { created: number; updated: number; variants: number; images: number; imagesFailed?: number };
};

type ProductForm = {
  sku: string;
  name: string;
  brandId: string;
  character: string;
  categoryId: string;
  presentation: string;
  pieces: string;
  isLimitedEdition: boolean;
  status: string;
  price: string;
  previousPrice: string;
  stock: string;
  color: string;
  isFeatured: boolean;
  description: string;
  material: string;
  altura: string;
  escala: string;
};

type Tab = 'dashboard' | 'inventory' | 'settings' | 'orders' | 'analytics' | 'reviews';

const emptyForm: ProductForm = {
  sku: '',
  name: '',
  brandId: '',
  character: '',
  categoryId: '',
  presentation: '',
  pieces: '',
  isLimitedEdition: false,
  status: 'ACTIVE',
  price: '',
  previousPrice: '',
  stock: '0',
  color: '',
  isFeatured: false,
  description: '',
  material: '',
  altura: '',
  escala: '',
};

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}

function readAdminToken() {
  return sessionStorage.getItem(TOKEN_KEY);
}

function writeAdminToken(token: string) {
  sessionStorage.setItem(TOKEN_KEY, token);
  localStorage.removeItem(TOKEN_KEY);
}

function clearAdminToken() {
  sessionStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_KEY);
}

function jsonHeaders(token: string) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

async function apiRequest<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { ...jsonHeaders(token), ...(init?.headers ?? {}) },
    cache: 'no-store',
  });
  if (!res.ok) {
    const details = await res.json().catch(() => null);
    const apiMessage = Array.isArray(details?.message) ? details.message.join(' ') : details?.message;
    const message =
      res.status === 401 || res.status === 403
        ? 'Sesion invalida o sin permisos de administrador.'
        : apiMessage
          ? `Error de la API ${res.status}: ${apiMessage}`
          : `Error de la API ${res.status}`;
    throw new Error(message);
  }
  return res.json();
}

async function apiFormRequest<T>(path: string, token: string, body: FormData, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    method: init?.method ?? 'POST',
    headers: { ...authHeaders(token), ...(init?.headers ?? {}) },
    body,
    cache: 'no-store',
  });
  if (!res.ok) {
    const details = await res.json().catch(() => null);
    const apiMessage = Array.isArray(details?.message) ? details.message.join(' ') : details?.message;
    const message =
      res.status === 401 || res.status === 403
        ? 'Sesion invalida o sin permisos de administrador.'
        : apiMessage
          ? `Error de la API ${res.status}: ${apiMessage}`
          : `Error de la API ${res.status}`;
    throw new Error(message);
  }
  return res.json();
}

async function apiStreamFormRequest<T>(path: string, token: string, body: FormData, onEvent: (event: any) => void): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { ...authHeaders(token) },
    body,
    cache: 'no-store',
  });
  if (!res.ok || !res.body) {
    const details = await res.json().catch(() => null);
    const apiMessage = Array.isArray(details?.message) ? details.message.join(' ') : details?.message;
    throw new Error(apiMessage ? `Error de la API ${res.status}: ${apiMessage}` : `Error de la API ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let finalPayload: T | null = null;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.trim()) continue;
      const event = JSON.parse(line);
      if (event.type === 'result') {
        finalPayload = event;
      } else {
        onEvent(event);
      }
    }
  }
  if (buffer.trim()) {
    const event = JSON.parse(buffer);
    if (event.type === 'result') finalPayload = event;
  }

  if (!finalPayload) throw new Error('La importacion no devolvio un resultado. Intenta de nuevo.');
  if ((finalPayload as any).error) {
    const apiMessage = Array.isArray((finalPayload as any).message) ? (finalPayload as any).message.join(' ') : (finalPayload as any).message;
    throw new Error(apiMessage ?? 'No fue posible completar la importacion.');
  }
  return finalPayload;
}

async function login(email: string, password: string) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error('Credenciales invalidas.');
  return res.json() as Promise<{ accessToken: string; user: AdminUser }>;
}

function numberOrUndefined(value: string) {
  if (value.trim() === '') return undefined;
  return Number(value);
}

function formFromProduct(product: Product): ProductForm {
  const specs = product.specifications ?? {};
  return {
    sku: product.sku,
    name: product.name,
    brandId: product.brandId,
    character: product.character ?? '',
    categoryId: product.categoryId,
    presentation: product.presentation ?? '',
    pieces: product.pieces != null ? String(product.pieces) : '',
    isLimitedEdition: Boolean(product.isLimitedEdition),
    status: product.status,
    price: String(product.price ?? ''),
    previousPrice: product.previousPrice ? String(product.previousPrice) : '',
    stock: String(product.inventory?.stock ?? 0),
    color: product.color ?? '',
    isFeatured: Boolean(product.isFeatured),
    description: product.description ?? '',
    material: typeof specs.material === 'string' ? specs.material : '',
    altura: typeof specs.altura === 'string' ? specs.altura : '',
    escala: typeof specs.escala === 'string' ? specs.escala : '',
  };
}

function buildProductPayload(form: ProductForm) {
  return {
    sku: form.sku.trim(),
    name: form.name.trim(),
    brandId: form.brandId,
    character: form.character.trim() || undefined,
    categoryId: form.categoryId,
    presentation: form.presentation.trim() || undefined,
    pieces: numberOrUndefined(form.pieces),
    isLimitedEdition: form.isLimitedEdition,
    status: form.status,
    description: form.description.trim(),
    specifications: {
      material: form.material.trim() || 'No especificado',
      altura: form.altura.trim() || 'No especificada',
      escala: form.escala.trim() || 'No especificada',
    },
    price: Number(form.price),
    previousPrice: numberOrUndefined(form.previousPrice),
    color: form.color.trim() || undefined,
    isFeatured: form.isFeatured,
    stock: Number(form.stock || 0),
  };
}

function labelFrom(labels: Record<string, string>, value?: string | null, fallback = 'Pendiente') {
  if (!value) return fallback;
  return labels[value] ?? value;
}

function StatusSelect({
  value,
  options,
  onChange,
  labels,
}: {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  labels?: Record<string, string>;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-10 w-full rounded-2xl border border-brand-line bg-white px-3 text-sm font-bold text-brand-inkSoft outline-none focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10"
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {labelFrom(labels ?? {}, option, option)}
        </option>
      ))}
    </select>
  );
}

const productStatusLabels: Record<string, string> = {
  ACTIVE: 'Visible en tienda',
  DRAFT: 'Borrador',
  INACTIVE: 'Inactivo',
};

const orderStatusLabels: Record<string, string> = {
  PENDING: 'Pendiente de pago',
  PAID: 'Pagado',
  PREPARING: 'En preparacion',
  SHIPPED: 'Enviado',
  DELIVERED: 'Entregado',
  CANCELLED: 'Cancelado',
};

const paymentMethodLabels: Record<string, string> = {
  WOMPI: 'Wompi',
  CASH_ON_DELIVERY: 'Pago contraentrega',
};

const paymentStatusLabels: Record<string, string> = {
  PENDING: 'pendiente',
  APPROVED: 'aprobado',
  DECLINED: 'rechazado',
  VOIDED: 'anulado',
  ERROR: 'con error',
};

function Field({
  label,
  value,
  onChange,
  type = 'text',
  required,
  min,
  step,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  min?: number;
  step?: number;
  inputMode?: 'numeric' | 'decimal' | 'text';
}) {
  return (
    <label className="block text-sm font-bold text-brand-inkSoft">
      {label}
      <input
        className="input-brand mt-2"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        type={type}
        required={required}
        min={min}
        step={step}
        inputMode={inputMode}
      />
    </label>
  );
}

function percent(value: number, total: number) {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((value / total) * 100));
}

function ProgressBar({ value, total, tone = 'blue' }: { value: number; total: number; tone?: 'blue' | 'emerald' | 'amber' | 'red' | 'slate' }) {
  const color = {
    blue: 'bg-brand-blue',
    emerald: 'bg-brand-green',
    amber: 'bg-amber-500',
    red: 'bg-red-500',
    slate: 'bg-brand-inkSoft/50',
  }[tone];

  return (
    <div className="h-2 overflow-hidden rounded-full bg-brand-paper2">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${percent(value, total)}%` }} />
    </div>
  );
}

export function AdminBackoffice() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AdminUser | null>(null);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<Option[]>([]);
  const [categories, setCategories] = useState<Option[]>([]);
  const [newBrand, setNewBrand] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [inventorySearch, setInventorySearch] = useState('');
  const [inventoryStatusFilter, setInventoryStatusFilter] = useState('ACTIVE');
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [variantDrafts, setVariantDrafts] = useState<Record<string, { colorName: string; colorHex: string; stock: string }>>({});
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [imageSavingId, setImageSavingId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{
    phase: 'parsing' | 'validating' | 'uploading';
    message: string;
    processedRows?: number;
    totalRows?: number;
    processedImages?: number;
    totalImages?: number;
  } | null>(null);
  const [importLog, setImportLog] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const cards = useMemo(
    () => [
      { title: 'Ventas del dia', value: formatCurrency(dashboard?.salesDay ?? 0), icon: BarChart3, helper: 'Ingresos confirmados' },
      { title: 'Ventas mensuales', value: formatCurrency(dashboard?.salesMonth ?? 0), icon: TrendingUp, helper: 'Mes actual' },
      { title: 'Pedidos pendientes', value: String(dashboard?.pendingOrders ?? 0), icon: ClipboardList, helper: 'Por validar' },
      { title: 'Inventario bajo', value: String(dashboard?.lowInventory ?? 0), icon: AlertTriangle, helper: 'Existencias criticas' },
    ],
    [dashboard],
  );

  const filteredProducts = useMemo(() => {
    const term = inventorySearch.trim().toLowerCase();
    return products.filter((product) => {
      const statusMatches = inventoryStatusFilter === 'ALL' || (inventoryStatusFilter === 'FEATURED' ? product.isFeatured : product.status === inventoryStatusFilter);
      const termMatches = !term || [product.name, product.sku, product.character ?? '', product.presentation ?? '', product.brand?.name].join(' ').toLowerCase().includes(term);
      return statusMatches && termMatches;
    });
  }, [inventorySearch, inventoryStatusFilter, products]);

  const visibleProductCount = products.filter((product) => product.status === 'ACTIVE').length;
  const featuredProductCount = products.filter((product) => product.isFeatured).length;
  const pendingReviewCount = reviews.filter((review) => review.status === 'PENDING').length;

  const dashboardData = useMemo(() => {
    const activeProducts = products.filter((product) => product.status === 'ACTIVE');
    const draftProducts = products.filter((product) => product.status === 'DRAFT');
    const inactiveProducts = products.filter((product) => product.status === 'INACTIVE');
    const lowStockProducts = products
      .map((product) => {
        const available = (product.inventory?.stock ?? 0) - (product.inventory?.reserved ?? 0);
        return { product, available };
      })
      .filter((entry) => entry.available <= (entry.product.inventory?.lowStockThreshold ?? 3))
      .sort((a, b) => a.available - b.available)
      .slice(0, 5);
    const recentOrders = [...orders]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 4);
    const pendingOrders = orders.filter((order) => order.status === 'PENDING');
    const paymentPending = orders.filter((order) => {
      const paymentStatus = order.payments?.[0]?.status;
      return order.status === 'PENDING' || !paymentStatus || paymentStatus === 'PENDING';
    });
    const reservedUnits = products.reduce((sum, product) => sum + (product.inventory?.reserved ?? 0), 0);
    const availableUnits = products.reduce((sum, product) => sum + Math.max(0, (product.inventory?.stock ?? 0) - (product.inventory?.reserved ?? 0)), 0);
    const orderStatusCounts = orderStatuses.map((status) => ({ status, count: orders.filter((order) => order.status === status).length }));

    return {
      activeProducts,
      draftProducts,
      inactiveProducts,
      lowStockProducts,
      recentOrders,
      pendingOrders,
      paymentPending,
      reservedUnits,
      availableUnits,
      orderStatusCounts,
    };
  }, [orders, products]);

  async function loadBackoffice(currentToken = token) {
    if (!currentToken) return;
    setLoading(true);
    setError(null);
    try {
      const [me, dashboardData, orderData, inventoryData, optionData, analyticsData, reviewData] = await Promise.all([
        apiRequest<AdminUser>('/auth/me', currentToken),
        apiRequest<Dashboard>('/admin/dashboard', currentToken),
        apiRequest<Order[]>('/orders', currentToken),
        apiRequest<{ items: Product[] }>('/products/admin/inventory?limit=100', currentToken),
        apiRequest<{ brands: Option[]; categories: Option[] }>('/products/admin/options', currentToken),
        apiRequest<AnalyticsSummary>('/analytics/admin/summary?days=30', currentToken).catch(() => null),
        apiRequest<{ items: ProductReview[]; summary: Array<{ status: string; _count: { id: number } }> }>('/reviews/admin', currentToken).catch(() => ({ items: [], summary: [] })),
      ]);
      if (!me.roles?.includes('ADMIN')) throw new Error('Este usuario no tiene rol ADMIN.');
      setUser(me);
      setDashboard(dashboardData);
      setOrders(orderData);
      setProducts(inventoryData.items);
      setBrands(optionData.brands);
      setCategories(optionData.categories);
      setAnalytics(analyticsData);
      setReviews(reviewData.items);
      setForm((current) => ({
        ...current,
        brandId: current.brandId || optionData.brands[0]?.id || '',
        categoryId: current.categoryId || optionData.categories[0]?.id || '',
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el backoffice.');
      clearAdminToken();
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const savedToken = readAdminToken();
    if (savedToken) {
      setToken(savedToken);
      void loadBackoffice(savedToken);
    }
  }, []);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const session = await login(email, password);
      if (!session.user.roles?.includes('ADMIN')) throw new Error('Este usuario no tiene rol ADMIN.');
      writeAdminToken(session.accessToken);
      setToken(session.accessToken);
      setUser(session.user);
      await loadBackoffice(session.accessToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible iniciar sesion.');
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    clearAdminToken();
    setToken(null);
    setUser(null);
    setDashboard(null);
    setOrders([]);
    setReviews([]);
    setAnalytics(null);
    setProducts([]);
    setActiveTab('dashboard');
  }

  function startCreate() {
    setEditingProduct(null);
    setForm({ ...emptyForm, brandId: brands[0]?.id ?? '', categoryId: categories[0]?.id ?? '' });
    setShowForm(true);
    setActiveTab('inventory');
  }

  function closeProductForm() {
    setShowForm(false);
    setEditingProduct(null);
  }

  function startEdit(product: Product) {
    setEditingProduct(product);
    setForm(formFromProduct(product));
    setShowForm(true);
    setActiveTab('inventory');
  }

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    if (form.isFeatured && !editingProduct?.isFeatured && featuredProductCount >= MAX_FEATURED_PRODUCTS) {
      setError(`Solo puedes tener ${MAX_FEATURED_PRODUCTS} productos destacados en portada. Quita uno antes de agregar otro.`);
      return;
    }
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const payload = buildProductPayload(form);
      if (editingProduct) {
        await apiRequest<Product>(`/products/${editingProduct.id}`, token, { method: 'PATCH', body: JSON.stringify(payload) });
        setNotice('Producto actualizado.');
      } else {
        await apiRequest<Product>('/products', token, { method: 'POST', body: JSON.stringify(payload) });
        setNotice('Producto creado.');
      }
      closeProductForm();
      await loadBackoffice(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible guardar el producto.');
    } finally {
      setSaving(false);
    }
  }

  async function quickUpdateProduct(product: Product, patch: Partial<{ price: number; previousPrice: number | null; stock: number; status: string; isFeatured: boolean; categoryId: string }>) {
    if (!token) return;
    if (patch.isFeatured === true && !product.isFeatured && featuredProductCount >= MAX_FEATURED_PRODUCTS) {
      setError(`Solo puedes tener ${MAX_FEATURED_PRODUCTS} productos destacados en portada. Quita uno antes de agregar otro.`);
      return;
    }
    setError(null);
    setNotice(null);
    try {
      await apiRequest<Product>(`/products/${product.id}`, token, { method: 'PATCH', body: JSON.stringify(patch) });
      setNotice(
        patch.isFeatured === true
          ? 'Producto agregado a destacados de portada.'
          : patch.isFeatured === false
            ? 'Producto quitado de destacados de portada.'
            : 'Inventario actualizado.',
      );
      await loadBackoffice(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible actualizar.');
    }
  }

  async function downloadInventoryTemplate() {
    if (!token) return;
    setError(null);
    try {
      const res = await fetch(`${API_URL}/products/admin/import/template`, {
        headers: authHeaders(token),
        cache: 'no-store',
      });
      if (!res.ok) throw new Error('No fue posible descargar la plantilla.');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'plantilla-inventario-collectorfigu.xlsx';
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible descargar la plantilla.');
    }
  }

  async function runInventoryImport(commit = false) {
    if (!token || !importFile) return;
    setImporting(true);
    setError(null);
    setNotice(null);
    setImportProgress({ phase: 'parsing', message: 'Leyendo el archivo...' });
    setImportLog([]);
    try {
      const body = new FormData();
      body.append('file', importFile);
      body.append('commit', String(commit));
      const payload = await apiStreamFormRequest<ImportPreview>('/products/admin/import', token, body, (event) => {
        if (event.type === 'progress') {
          setImportProgress(event);
        } else if (event.type === 'warning') {
          setImportLog((current) => [...current.slice(-49), `Fila ${event.line || '-'}: ${event.message}`]);
        }
      });
      setImportPreview(payload);
      if (commit) {
        const failed = payload.result?.imagesFailed ?? 0;
        setNotice(
          `Importacion completada: ${payload.result?.created ?? 0} nuevos, ${payload.result?.updated ?? 0} actualizados, ${payload.result?.images ?? 0} imagenes.` +
            (failed ? ` ${failed} imagen(es) no se pudieron subir, revisa las advertencias.` : ''),
        );
        setImportFile(null);
        await loadBackoffice(token);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible importar el inventario.');
    } finally {
      setImporting(false);
      setImportProgress(null);
    }
  }

  function updateVariantDraft(productId: string, patch: Partial<{ colorName: string; colorHex: string; stock: string }>) {
    setVariantDrafts((current) => ({
      ...current,
      [productId]: { ...(current[productId] ?? { colorName: '', colorHex: '#111827', stock: '0' }), ...patch },
    }));
  }

  async function addProductVariant(product: Product) {
    if (!token) return;
    const draft = variantDrafts[product.id] ?? { colorName: '', colorHex: '#111827', stock: '0' };
    if (!draft.colorName.trim()) {
      setError('Escribe el nombre del color antes de agregarlo.');
      return;
    }
    setError(null);
    setNotice(null);
    try {
      await apiRequest(`/products/${product.id}/variants`, token, {
        method: 'POST',
        body: JSON.stringify({ colorName: draft.colorName.trim(), colorHex: draft.colorHex, stock: Number(draft.stock || 0) }),
      });
      setVariantDrafts((current) => ({ ...current, [product.id]: { colorName: '', colorHex: '#111827', stock: '0' } }));
      setNotice('Color agregado al inventario.');
      await loadBackoffice(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible agregar el color.');
    }
  }

  async function updateProductVariant(product: Product, variant: ProductVariant, patch: Partial<{ colorName: string; colorHex: string; stock: number; isActive: boolean }>) {
    if (!token) return;
    setError(null);
    setNotice(null);
    try {
      await apiRequest(`/products/${product.id}/variants/${variant.id}`, token, { method: 'PATCH', body: JSON.stringify(patch) });
      setNotice('Color actualizado.');
      await loadBackoffice(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible actualizar el color.');
    }
  }

  async function deleteProductVariant(product: Product, variant: ProductVariant) {
    if (!token) return;
    const ok = window.confirm(`Eliminar o desactivar el color ${variant.colorName}?`);
    if (!ok) return;
    setError(null);
    setNotice(null);
    try {
      await apiRequest(`/products/${product.id}/variants/${variant.id}`, token, { method: 'DELETE' });
      setNotice('Color eliminado o desactivado.');
      await loadBackoffice(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible eliminar el color.');
    }
  }

  async function createCatalogOption(kind: 'brands' | 'categories', name: string) {
    if (!token || !name.trim()) return;
    setError(null);
    setNotice(null);
    try {
      await apiRequest(`/products/admin/${kind}`, token, { method: 'POST', body: JSON.stringify({ name }) });
      setNotice(kind === 'brands' ? 'Marca creada.' : 'Categoria creada.');
      if (kind === 'brands') setNewBrand('');
      if (kind === 'categories') setNewCategory('');
      await loadBackoffice(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible crear la opcion.');
    }
  }

  async function renameCatalogOption(kind: 'brands' | 'categories', option: Option) {
    if (!token) return;
    const name = window.prompt('Nuevo nombre', option.name);
    if (!name?.trim() || name.trim() === option.name) return;
    setError(null);
    setNotice(null);
    try {
      await apiRequest(`/products/admin/${kind}/${option.id}`, token, { method: 'PATCH', body: JSON.stringify({ name }) });
      setNotice('Opcion actualizada.');
      await loadBackoffice(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible actualizar.');
    }
  }

  async function deleteCatalogOption(kind: 'brands' | 'categories', option: Option) {
    if (!token) return;
    const ok = window.confirm(`Eliminar ${option.name}? Solo se permite si no tiene productos asociados.`);
    if (!ok) return;
    setError(null);
    setNotice(null);
    try {
      await apiRequest(`/products/admin/${kind}/${option.id}`, token, { method: 'DELETE' });
      setNotice('Opcion eliminada.');
      await loadBackoffice(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible eliminar. Revisa que no tenga productos asociados.');
    }
  }

  async function deactivateProduct(product: Product) {
    if (!token) return;
    const ok = window.confirm(`Desactivar ${product.name}? No se elimina de la base, solo deja de verse en la tienda.`);
    if (!ok) return;
    setError(null);
    setNotice(null);
    try {
      await apiRequest<Product>(`/products/${product.id}`, token, { method: 'DELETE' });
      setNotice('Producto desactivado.');
      await loadBackoffice(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible desactivar.');
    }
  }

  async function uploadProductImages(product: Product, files: FileList | File[] | null | undefined, isMain = false, variantId?: string) {
    const selectedFiles = Array.from(files ?? []);
    if (!token || !selectedFiles.length) return;
    setImageSavingId(variantId ?? product.id);
    setError(null);
    setNotice(null);
    try {
      const existingImages = variantId ? product.images?.filter((image) => image.variantId === variantId) : product.images?.filter((image) => !image.variantId);
      const remaining = Math.max(0, 5 - (existingImages?.length ?? 0));
      if (remaining <= 0) {
        setError('Maximo 5 imagenes por color o producto.');
        return;
      }
      const filesToUpload = selectedFiles.slice(0, remaining);
      for (const [index, file] of filesToUpload.entries()) {
        const body = new FormData();
        body.append('file', file);
        body.append('alt', product.name);
        if (variantId) body.append('variantId', variantId);
        body.append('isMain', String((isMain && index === 0) || (!existingImages?.length && index === 0)));
        await apiFormRequest(`/products/${product.id}/images`, token, body);
      }
      setNotice(selectedFiles.length > remaining ? `Se cargaron ${filesToUpload.length} imagenes. El maximo es 5.` : `${filesToUpload.length} imagen(es) cargada(s).`);
      await loadBackoffice(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible cargar la imagen.');
    } finally {
      setImageSavingId(null);
    }
  }

  async function replaceProductImage(product: Product, imageId: string, file: File | undefined) {
    if (!token || !file) return;
    setImageSavingId(imageId);
    setError(null);
    setNotice(null);
    try {
      const body = new FormData();
      body.append('file', file);
      await apiFormRequest(`/products/${product.id}/images/${imageId}`, token, body, { method: 'PATCH' });
      setNotice('Imagen actualizada.');
      await loadBackoffice(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible actualizar la imagen.');
    } finally {
      setImageSavingId(null);
    }
  }

  async function setMainImage(product: Product, image: ProductImage) {
    if (!token) return;
    setImageSavingId(image.id);
    setError(null);
    setNotice(null);
    try {
      const body = new FormData();
      body.append('isMain', 'true');
      await apiFormRequest(`/products/${product.id}/images/${image.id}`, token, body, { method: 'PATCH' });
      setNotice('Imagen principal actualizada.');
      await loadBackoffice(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible marcar la imagen principal.');
    } finally {
      setImageSavingId(null);
    }
  }

  async function reorderProductImage(product: Product, image: ProductImage, images: ProductImage[], direction: -1 | 1) {
    if (!token) return;
    const sortedImages = [...images].sort((a, b) => a.sortOrder - b.sortOrder);
    const index = sortedImages.findIndex((item) => item.id === image.id);
    const target = sortedImages[index + direction];
    if (!target) return;
    setImageSavingId(image.id);
    setError(null);
    setNotice(null);
    try {
      const currentBody = new FormData();
      currentBody.append('sortOrder', String(target.sortOrder));
      const targetBody = new FormData();
      targetBody.append('sortOrder', String(image.sortOrder));
      await Promise.all([
        apiFormRequest(`/products/${product.id}/images/${image.id}`, token, currentBody, { method: 'PATCH' }),
        apiFormRequest(`/products/${product.id}/images/${target.id}`, token, targetBody, { method: 'PATCH' }),
      ]);
      setNotice('Orden de imagenes actualizado.');
      await loadBackoffice(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible ordenar las imagenes.');
    } finally {
      setImageSavingId(null);
    }
  }

  async function deleteProductImage(product: Product, imageId: string) {
    if (!token) return;
    const ok = window.confirm('Eliminar esta imagen del producto?');
    if (!ok) return;
    setImageSavingId(imageId);
    setError(null);
    try {
      await apiRequest(`/products/${product.id}/images/${imageId}`, token, { method: 'DELETE' });
      setNotice('Imagen eliminada.');
      await loadBackoffice(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible eliminar la imagen.');
    } finally {
      setImageSavingId(null);
    }
  }

  async function updateOrderStatus(orderId: string, status: string) {
    if (!token) return;
    setError(null);
    await apiRequest(`/orders/${orderId}/status`, token, { method: 'PATCH', body: JSON.stringify({ status }) });
    await loadBackoffice(token);
  }

  async function deleteOrder(order: Order) {
    if (!token) return;
    const ok = window.confirm(`Eliminar el pedido ${order.orderNumber}? Esta accion no se puede deshacer.`);
    if (!ok) return;
    setError(null);
    setNotice(null);
    try {
      await apiRequest(`/orders/${order.id}`, token, { method: 'DELETE' });
      setNotice('Pedido eliminado.');
      await loadBackoffice(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible eliminar el pedido.');
    }
  }

  async function updateReviewStatus(reviewId: string, status: string) {
    if (!token) return;
    setError(null);
    setNotice(null);
    try {
      await apiRequest(`/reviews/admin/${reviewId}`, token, { method: 'PATCH', body: JSON.stringify({ status }) });
      setNotice(status === 'APPROVED' ? 'Comentario publicado.' : status === 'REJECTED' ? 'Comentario rechazado.' : 'Comentario actualizado.');
      await loadBackoffice(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible actualizar el comentario.');
    }
  }

  async function deleteReview(review: ProductReview) {
    if (!token) return;
    const ok = window.confirm(`Eliminar el comentario de ${review.name}?`);
    if (!ok) return;
    setError(null);
    setNotice(null);
    try {
      await apiRequest(`/reviews/admin/${review.id}`, token, { method: 'DELETE' });
      setNotice('Comentario eliminado.');
      await loadBackoffice(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible eliminar el comentario.');
    }
  }

  if (!token || !user) {
    return (
      <main className="container-page grid min-h-[calc(100vh-4rem)] items-center py-10">
        <section className="mx-auto grid w-full max-w-5xl overflow-hidden rounded-[2rem] bg-white shadow-card lg:grid-cols-[1fr_420px]">
          <div className="surface-dark p-8 sm:p-10">
            <p className="badge-brand">Panel administrativo</p>
            <h1 className="mt-5 text-4xl font-black">Acceso administrativo</h1>
            <p className="mt-4 max-w-xl text-white/65">Ingresa con un usuario administrador para gestionar ventas, pedidos, inventario y solicitudes.</p>
            <div className="mt-10 grid gap-3 text-sm font-bold text-white/75">
              <span className="inline-flex items-center gap-3"><ShieldCheck className="text-brand-cyan" size={20} /> Panel protegido con JWT</span>
              <span className="inline-flex items-center gap-3"><PackagePlus className="text-brand-cyan" size={20} /> Inventario editable</span>
              <span className="inline-flex items-center gap-3"><CheckCircle2 className="text-brand-cyan" size={20} /> Validacion de rol ADMIN</span>
            </div>
          </div>

          <form onSubmit={handleLogin} className="p-8 sm:p-10">
            <h2 className="text-2xl font-black">Iniciar sesion</h2>
            <Field label="Correo" value={email} onChange={setEmail} type="email" required />
            <div className="mt-4">
              <Field label="Contrasena" value={password} onChange={setPassword} type="password" required />
            </div>
            {error ? <p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p> : null}
            <button className="btn-primary mt-6 w-full" disabled={loading}>{loading ? 'Validando...' : 'Entrar al panel'}</button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main>
      <section className="surface-dark">
        <div className="container-page py-10">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="badge-brand">Panel administrativo</p>
              <h1 className="mt-4 text-4xl font-black">Panel administrativo</h1>
              <p className="mt-3 text-white/60">Sesion activa: {user.email}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button className="btn-secondary" onClick={() => loadBackoffice()} disabled={loading}><RefreshCw size={18} /> Actualizar</button>
              <button className="btn-secondary" onClick={logout}><LogOut size={18} /> Salir</button>
            </div>
          </div>
        </div>
      </section>

      <section className="container-page py-8">
        {error ? <p className="mb-5 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700">{error}</p> : null}
        {notice ? <p className="mb-5 rounded-2xl bg-brand-green/10 p-4 text-sm font-bold text-brand-green">{notice}</p> : null}

        <div className="mb-6 flex flex-wrap gap-2 rounded-3xl bg-white p-2 shadow-soft">
          {[
            ['dashboard', 'Inicio'],
            ['inventory', `Inventario (${products.length})`],
            ['settings', 'Parametrizacion'],
            ['orders', `Pedidos (${orders.length})`],
            ['analytics', 'Analitica'],
            ['reviews', `Comentarios (${pendingReviewCount})`],
          ].map(([tab, label]) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as Tab)}
              className={`rounded-2xl px-4 py-3 text-sm font-black transition ${activeTab === tab ? 'bg-brand-dark text-white' : 'text-brand-inkSoft hover:bg-brand-paper2'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {activeTab === 'dashboard' ? (
          <div className="grid gap-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              {cards.map((card) => {
                const Icon = card.icon;
                return (
                  <article className="card p-5" key={card.title}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="inline-flex rounded-2xl bg-brand-blue/10 p-3 text-brand-blue"><Icon size={22} /></div>
                      {card.title === 'Pedidos pendientes' && dashboardData.pendingOrders.length ? (
                        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-black text-amber-700">por revisar</span>
                      ) : null}
                    </div>
                    <p className="mt-4 text-sm font-semibold text-brand-inkSoft">{card.title}</p>
                    <p className="mt-2 text-2xl font-black">{card.value}</p>
                    <p className="mt-1 text-xs font-semibold text-brand-inkSoft/70">{card.helper}</p>
                  </article>
                );
              })}
            </div>

            <div className="grid gap-5 xl:grid-cols-[1.3fr_.7fr]">
              <section className="overflow-hidden rounded-[2rem] bg-brand-dark bg-brand-radial text-white shadow-glow">
                <div className="grid gap-5 p-6 lg:grid-cols-[1fr_240px] lg:items-center">
                  <div>
                    <p className="badge-brand bg-white/10">Resumen operativo</p>
                    <h2 className="mt-4 text-3xl font-black">Hoy hay {dashboardData.pendingOrders.length} pedidos por validar.</h2>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-white/60">El panel prioriza pagos pendientes y productos con pocas existencias.</p>
                    <div className="mt-5 flex flex-wrap gap-3">
                      <button className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-brand-dark" onClick={() => setActiveTab('orders')}>Revisar pedidos</button>
                      <button className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-black text-white" onClick={() => setActiveTab('inventory')}>Ver inventario</button>
                    </div>
                  </div>
                  <div className="grid gap-3 rounded-[1.5rem] border border-white/10 bg-white/10 p-4">
                    <div>
                      <div className="flex justify-between text-sm font-bold text-white/70"><span>Existencias disponibles</span><span>{dashboardData.availableUnits}</span></div>
                      <ProgressBar value={dashboardData.availableUnits} total={dashboardData.availableUnits + dashboardData.reservedUnits} tone="emerald" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm font-bold text-white/70"><span>Unidades reservadas</span><span>{dashboardData.reservedUnits}</span></div>
                      <ProgressBar value={dashboardData.reservedUnits} total={dashboardData.availableUnits + dashboardData.reservedUnits} tone="amber" />
                    </div>
                    <div className="grid grid-cols-3 gap-2 pt-2 text-center">
                      <div className="rounded-2xl bg-white/10 p-3"><p className="text-xl font-black">{dashboardData.activeProducts.length}</p><p className="text-[11px] font-bold text-white/50">visibles</p></div>
                      <div className="rounded-2xl bg-white/10 p-3"><p className="text-xl font-black">{dashboardData.draftProducts.length}</p><p className="text-[11px] font-bold text-white/50">borrador</p></div>
                      <div className="rounded-2xl bg-white/10 p-3"><p className="text-xl font-black">{dashboardData.inactiveProducts.length}</p><p className="text-[11px] font-bold text-white/50">inactivos</p></div>
                    </div>
                  </div>
                </div>
              </section>

              <section className="card p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-black uppercase text-brand-blue">Alertas</p>
                    <h2 className="mt-1 text-2xl font-black">Prioridad</h2>
                  </div>
                  <AlertTriangle className={dashboardData.lowStockProducts.length || dashboardData.paymentPending.length ? 'text-amber-500' : 'text-brand-green'} size={26} />
                </div>
                <div className="mt-5 grid gap-3">
                  <button className="rounded-2xl bg-amber-50 p-4 text-left" onClick={() => setActiveTab('orders')}>
                    <p className="text-sm font-black text-amber-800">{dashboardData.paymentPending.length} pagos por validar</p>
                    <p className="mt-1 text-xs font-semibold text-amber-700/70">Pedidos pendientes o sin aprobacion registrada.</p>
                  </button>
                  <button className="rounded-2xl bg-red-50 p-4 text-left" onClick={() => setActiveTab('inventory')}>
                    <p className="text-sm font-black text-red-700">{dashboardData.lowStockProducts.length} productos con alerta de existencias</p>
                    <p className="mt-1 text-xs font-semibold text-red-600/70">Prioriza reposicion o desactiva venta si aplica.</p>
                  </button>
                </div>
              </section>
            </div>

            <div className="grid gap-5 xl:grid-cols-3">
              <section className="card p-6 xl:col-span-2">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-black uppercase text-brand-blue">Pedidos recientes</p>
                    <h2 className="mt-1 text-2xl font-black">Trazabilidad comercial</h2>
                  </div>
                  <button className="btn-light" onClick={() => setActiveTab('orders')}>Ver pedidos</button>
                </div>
                <div className="mt-5 grid gap-3">
                  {dashboardData.recentOrders.map((order) => (
                    <div key={order.id} className="grid gap-3 rounded-2xl border border-brand-line bg-white p-4 md:grid-cols-[1fr_auto] md:items-center">
                      <div>
                        <p className="text-sm font-black text-brand-ink">{order.orderNumber} · {formatCurrency(order.grandTotal)}</p>
                        <p className="mt-1 text-xs font-semibold text-brand-inkSoft">{order.user?.email ?? 'Cliente'} · {new Date(order.createdAt).toLocaleString('es-CO')}</p>
                        <p className="mt-1 text-xs font-semibold text-brand-inkSoft/70">{labelFrom(paymentMethodLabels, order.paymentMethod ?? order.payments?.[0]?.method, 'Metodo pendiente')}</p>
                      </div>
                      <span className="rounded-full bg-brand-paper2 px-3 py-1 text-xs font-black text-brand-inkSoft">{labelFrom(orderStatusLabels, order.status)}</span>
                    </div>
                  ))}
                  {!dashboardData.recentOrders.length ? <p className="rounded-2xl bg-brand-paper2 p-5 text-center text-sm font-bold text-brand-inkSoft">Todavia no hay pedidos registrados.</p> : null}
                </div>
              </section>

              <section className="card p-6">
                <p className="text-sm font-black uppercase text-brand-blue">Embudo de pedidos</p>
                <h2 className="mt-1 text-2xl font-black">Estados</h2>
                <div className="mt-5 grid gap-4">
                  {dashboardData.orderStatusCounts.map((entry) => (
                    <div key={entry.status}>
                      <div className="mb-2 flex justify-between text-xs font-black text-brand-inkSoft">
                        <span>{labelFrom(orderStatusLabels, entry.status)}</span>
                        <span>{entry.count}</span>
                      </div>
                      <ProgressBar value={entry.count} total={Math.max(orders.length, 1)} tone={entry.status === 'CANCELLED' ? 'red' : entry.status === 'DELIVERED' ? 'emerald' : 'blue'} />
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <div className="grid gap-5 xl:grid-cols-2">
              <section className="card p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-black uppercase text-brand-blue">Inventario sensible</p>
                    <h2 className="mt-1 text-2xl font-black">Existencias criticas</h2>
                  </div>
                  <button className="btn-light" onClick={() => setActiveTab('inventory')}>Gestionar</button>
                </div>
                <div className="mt-5 grid gap-3">
                  {dashboardData.lowStockProducts.map(({ product, available }) => (
                    <div key={product.id} className="flex items-center justify-between gap-3 rounded-2xl border border-brand-line bg-white p-4">
                      <div>
                        <p className="font-black text-brand-ink">{product.name}</p>
                        <p className="mt-1 text-xs font-semibold text-brand-inkSoft/70">{product.sku} · Reservado {product.inventory?.reserved ?? 0}</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-black ${available <= 0 ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>{available} disponibles</span>
                    </div>
                  ))}
                  {!dashboardData.lowStockProducts.length ? <p className="rounded-2xl bg-brand-green/10 p-5 text-center text-sm font-bold text-brand-green">Sin alertas de existencias bajas.</p> : null}
                </div>
              </section>

              <section className="card p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-black uppercase text-brand-blue">Comentarios</p>
                    <h2 className="mt-1 text-2xl font-black">Reseñas por moderar</h2>
                  </div>
                  <button className="btn-light" onClick={() => setActiveTab('reviews')}>Ver comentarios</button>
                </div>
                <div className="mt-5 grid gap-3">
                  <div className="rounded-2xl border border-brand-line bg-white p-4">
                    <p className="font-black text-brand-ink">{pendingReviewCount} comentarios pendientes</p>
                    <p className="mt-1 text-xs font-semibold text-brand-inkSoft">Aprueba o rechaza reseñas de clientes antes de publicarlas.</p>
                  </div>
                  {!pendingReviewCount ? <p className="rounded-2xl bg-brand-green/10 p-5 text-center text-sm font-bold text-brand-green">Sin comentarios pendientes de moderacion.</p> : null}
                </div>
              </section>
            </div>
          </div>
        ) : null}

        {activeTab === 'settings' ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <section className="card p-6">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-brand-blue/10 p-3 text-brand-blue"><Settings size={22} /></div>
                <div>
                  <h2 className="text-2xl font-black">Marcas</h2>
                  <p className="mt-1 text-sm text-brand-inkSoft">Estas marcas alimentan filtros, formularios de inventario y tarjetas de producto.</p>
                </div>
              </div>
              <div className="mt-5 flex gap-2">
                <input className="input-brand" value={newBrand} onChange={(event) => setNewBrand(event.target.value)} placeholder="Nueva marca" />
                <button className="btn-primary shrink-0" onClick={() => createCatalogOption('brands', newBrand)}><Plus size={18} /></button>
              </div>
              <div className="mt-5 grid gap-3">
                {brands.map((brand) => (
                  <div key={brand.id} className="flex items-center justify-between gap-3 rounded-2xl border border-brand-line bg-white p-4">
                    <div>
                      <p className="font-black">{brand.name}</p>
                      <p className="text-xs font-semibold text-brand-inkSoft/70">{brand.slug}</p>
                    </div>
                    <div className="flex gap-2">
                      <button className="rounded-2xl border border-brand-line p-3 text-brand-inkSoft" onClick={() => renameCatalogOption('brands', brand)}><Edit3 size={16} /></button>
                      <button className="rounded-2xl border border-red-100 p-3 text-red-600" onClick={() => deleteCatalogOption('brands', brand)}><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="card p-6">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-brand-blue/10 p-3 text-brand-blue"><Settings size={22} /></div>
                <div>
                  <h2 className="text-2xl font-black">Categorias</h2>
                  <p className="mt-1 text-sm text-brand-inkSoft">Controlan agrupaciones de tienda, filtros y clasificacion de inventario.</p>
                </div>
              </div>
              <div className="mt-5 flex gap-2">
                <input className="input-brand" value={newCategory} onChange={(event) => setNewCategory(event.target.value)} placeholder="Nueva categoria" />
                <button className="btn-primary shrink-0" onClick={() => createCatalogOption('categories', newCategory)}><Plus size={18} /></button>
              </div>
              <div className="mt-5 grid gap-3">
                {categories.map((category) => (
                  <div key={category.id} className="flex items-center justify-between gap-3 rounded-2xl border border-brand-line bg-white p-4">
                    <div>
                      <p className="font-black">{category.name}</p>
                      <p className="text-xs font-semibold text-brand-inkSoft/70">{category.slug}</p>
                    </div>
                    <div className="flex gap-2">
                      <button className="rounded-2xl border border-brand-line p-3 text-brand-inkSoft" onClick={() => renameCatalogOption('categories', category)}><Edit3 size={16} /></button>
                      <button className="rounded-2xl border border-red-100 p-3 text-red-600" onClick={() => deleteCatalogOption('categories', category)}><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        ) : null}

        {activeTab === 'inventory' ? (
          <div id="inventario-top" className="grid scroll-mt-28 gap-5">
            <div className="card p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="relative max-w-xl flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-inkSoft/70" size={18} />
                  <input
                    className="input-brand pl-11"
                    value={inventorySearch}
                    onChange={(event) => setInventorySearch(event.target.value)}
                    placeholder="Buscar por nombre, SKU, personaje o franquicia"
                  />
                </div>
                <select className="input-brand max-w-52" value={inventoryStatusFilter} onChange={(event) => setInventoryStatusFilter(event.target.value)}>
                  <option value="ACTIVE">Visible en tienda ({visibleProductCount})</option>
                  <option value="FEATURED">Destacados portada ({featuredProductCount}/{MAX_FEATURED_PRODUCTS})</option>
                  <option value="DRAFT">Borradores</option>
                  <option value="INACTIVE">Inactivos</option>
                  <option value="ALL">Todos</option>
                </select>
                <button className="btn-primary" onClick={startCreate}><Plus size={18} /> Nuevo producto</button>
              </div>
              <p className="mt-3 text-xs font-semibold text-brand-inkSoft">Marca hasta {MAX_FEATURED_PRODUCTS} productos para mostrarlos en la pantalla de inicio. Si no marcas ninguno, la portada usa productos recientes como respaldo.</p>
            </div>

            <div className="card p-5">
              <div className="grid gap-4 xl:grid-cols-[1fr_auto] xl:items-start">
                <div>
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl bg-brand-blue/10 p-3 text-brand-blue"><Upload size={22} /></div>
                    <div>
                      <p className="text-sm font-black uppercase text-brand-blue">Importacion masiva</p>
                      <h2 className="mt-1 text-2xl font-black">Cargar figuras, colores, stock e imagenes</h2>
                      <p className="mt-2 max-w-3xl text-sm font-semibold text-brand-inkSoft">
                        Usa la plantilla Excel .xlsx o un CSV exportado desde Excel/Google Sheets. Una fila representa un color/variante de la figura; las imagenes se cargan desde URLs publicas JPG, PNG o WebP.
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-2 text-xs font-semibold text-brand-inkSoft sm:grid-cols-3">
                    <span className="rounded-2xl bg-brand-paper2 p-3">SKU repetido actualiza el producto.</span>
                    <span className="rounded-2xl bg-brand-paper2 p-3">color_nombre crea o actualiza variante.</span>
                    <span className="rounded-2xl bg-brand-paper2 p-3">imagen_url se asocia al color.</span>
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 xl:min-w-[420px]">
                  <button className="btn-light" onClick={downloadInventoryTemplate}><Download size={17} /> Plantilla Excel</button>
                  <label className="inline-flex cursor-pointer items-center justify-center rounded-2xl border border-brand-line bg-white px-4 py-3 text-sm font-black text-brand-inkSoft hover:border-brand-blue hover:text-brand-blue">
                      <FileText size={17} className="mr-2" /> {importFile ? importFile.name : 'Seleccionar .xlsx o CSV'}
                    <input
                      type="file"
                      accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,text/plain"
                      className="hidden"
                      onChange={(event) => {
                        setImportFile(event.target.files?.[0] ?? null);
                        setImportPreview(null);
                      }}
                    />
                  </label>
                  <button className="rounded-2xl bg-brand-dark px-4 py-3 text-sm font-black text-white transition disabled:cursor-not-allowed disabled:bg-brand-inkSoft/15 disabled:text-brand-inkSoft/40" disabled={!importFile || importing} onClick={() => runInventoryImport(false)}>
                    {importing ? 'Procesando...' : 'Previsualizar'}
                  </button>
                  <button className="btn-primary" disabled={!importFile || importing || !importPreview || importPreview.summary.errors > 0} onClick={() => runInventoryImport(true)}>
                    <CheckCircle2 size={17} /> Confirmar importacion
                  </button>
                </div>
              </div>

              {importing && importProgress ? (
                <div className="mt-5 rounded-3xl border border-brand-violet/20 bg-brand-violet/5 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="inline-flex items-center gap-2 text-sm font-black text-brand-ink">
                      <Loader2 size={16} className="animate-spin text-brand-violet" />
                      {importProgress.phase === 'parsing' ? 'Leyendo archivo...' : importProgress.phase === 'validating' ? 'Validando filas...' : 'Subiendo imagenes...'}
                    </p>
                    {importProgress.phase === 'uploading' && importProgress.totalImages ? (
                      <p className="font-mono text-xs font-bold text-brand-inkSoft">{importProgress.processedImages}/{importProgress.totalImages} imagenes · {importProgress.processedRows}/{importProgress.totalRows} productos</p>
                    ) : null}
                  </div>

                  {importProgress.phase === 'uploading' && importProgress.totalImages ? (
                    <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-brand-paper2">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-brand-violet to-brand-pop transition-all duration-300"
                        style={{ width: `${Math.min(100, Math.round(((importProgress.processedImages ?? 0) / Math.max(1, importProgress.totalImages)) * 100))}%` }}
                      />
                    </div>
                  ) : (
                    <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-brand-paper2">
                      <div className="h-full w-1/3 animate-pulse rounded-full bg-gradient-to-r from-brand-violet to-brand-pop" />
                    </div>
                  )}

                  <p className="mt-2 line-clamp-1 text-xs font-semibold text-brand-inkSoft">{importProgress.message}</p>

                  {importLog.length ? (
                    <div className="mt-3 max-h-32 overflow-y-auto rounded-2xl bg-white/70 p-3 font-mono text-[11px] leading-relaxed text-brand-inkSoft">
                      {importLog.slice(-8).map((line, index) => <p key={index}>{line}</p>)}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {importPreview ? (
                <div className="mt-5 grid gap-4">
                  <div className="grid gap-3 md:grid-cols-5">
                    <div className="rounded-2xl bg-brand-paper2 p-4"><span className="text-xs font-black text-brand-inkSoft/70">Filas</span><strong className="mt-1 block text-xl">{importPreview.summary.rows}</strong></div>
                    <div className="rounded-2xl bg-brand-paper2 p-4"><span className="text-xs font-black text-brand-inkSoft/70">Productos</span><strong className="mt-1 block text-xl">{importPreview.summary.products}</strong></div>
                    <div className="rounded-2xl bg-brand-paper2 p-4"><span className="text-xs font-black text-brand-inkSoft/70">Colores</span><strong className="mt-1 block text-xl">{importPreview.summary.variants}</strong></div>
                    <div className="rounded-2xl bg-brand-paper2 p-4"><span className="text-xs font-black text-brand-inkSoft/70">Imagenes</span><strong className="mt-1 block text-xl">{importPreview.summary.imageCount}</strong></div>
                    <div className={`rounded-2xl p-4 ${importPreview.summary.errors ? 'bg-red-50 text-red-700' : 'bg-brand-green/10 text-brand-green'}`}>
                      <span className="text-xs font-black">Estado</span><strong className="mt-1 block text-xl">{importPreview.summary.errors ? `${importPreview.summary.errors} errores` : 'Listo'}</strong>
                    </div>
                  </div>

                  {importPreview.errors.length ? (
                    <div className="rounded-3xl border border-red-100 bg-red-50 p-4">
                      <p className="font-black text-red-700">Errores por corregir</p>
                      <div className="mt-3 grid gap-2 text-sm font-semibold text-red-700">
                        {importPreview.errors.slice(0, 10).map((entry, index) => <p key={`${entry.line}-${index}`}>Fila {entry.line || '-'}: {entry.message}</p>)}
                      </div>
                    </div>
                  ) : null}

                  {importPreview.warnings.length ? (
                    <div className="rounded-3xl border border-amber-100 bg-amber-50 p-4">
                      <p className="font-black text-amber-700">Alertas</p>
                      <div className="mt-3 grid gap-2 text-sm font-semibold text-amber-700">
                        {importPreview.warnings.slice(0, 8).map((entry, index) => <p key={`${entry.line}-${index}`}>Fila {entry.line || '-'}: {entry.message}</p>)}
                      </div>
                    </div>
                  ) : null}

                  {importPreview.rows?.length ? (
                    <div className="overflow-hidden rounded-3xl border border-brand-line">
                      <div className="grid grid-cols-[80px_1fr_1fr_120px_90px] bg-brand-paper2 px-4 py-3 text-xs font-black uppercase text-brand-inkSoft/70">
                        <span>Fila</span><span>Producto</span><span>Marca</span><span>Color</span><span>Stock</span>
                      </div>
                      {importPreview.rows.slice(0, 8).map((row) => (
                        <div key={`${row.line}-${row.sku}`} className="grid grid-cols-[80px_1fr_1fr_120px_90px] border-t border-brand-line px-4 py-3 text-sm font-semibold text-brand-inkSoft">
                          <span>{row.line}</span><span>{row.sku} · {row.name}</span><span>{row.brandName}</span><span>{row.colorName ?? 'General'}</span><span>{row.stock}</span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>

            {showForm ? (
              <div className={editingProduct ? "fixed inset-0 z-50 overflow-y-auto bg-brand-ink/55 p-3 backdrop-blur-sm sm:p-6" : ""}>
              <form onSubmit={saveProduct} className={editingProduct ? "mx-auto my-4 max-w-6xl rounded-[2rem] bg-white p-5 shadow-2xl ring-1 ring-brand-ink/10 sm:my-8" : "card p-5"}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-black uppercase text-brand-blue">{editingProduct ? 'Editar producto' : 'Nuevo producto'}</p>
                    <h2 className="mt-1 text-2xl font-black">{editingProduct ? editingProduct.name : 'Crear producto de inventario'}</h2>
                  </div>
                  <button type="button" className="rounded-2xl border border-brand-line p-3" onClick={closeProductForm}><X size={18} /></button>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Field label="SKU" value={form.sku} onChange={(value) => setForm({ ...form, sku: value })} required />
                  <Field label="Nombre visible" value={form.name} onChange={(value) => setForm({ ...form, name: value })} required />
                  <Field label="Personaje" value={form.character} onChange={(value) => setForm({ ...form, character: value })} />
                  <Field label="Color" value={form.color} onChange={(value) => setForm({ ...form, color: value })} />

                  <label className="block text-sm font-bold text-brand-inkSoft">
                    Franquicia
                    <select className="input-brand mt-2" value={form.brandId} onChange={(event) => setForm({ ...form, brandId: event.target.value })} required>
                      {brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
                    </select>
                  </label>
                  <label className="block text-sm font-bold text-brand-inkSoft">
                    Línea de producto (categoría)
                    <select className="input-brand mt-2" value={form.categoryId} onChange={(event) => setForm({ ...form, categoryId: event.target.value })} required>
                      {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                    </select>
                  </label>
                  <Field label="Presentacion (texto libre)" value={form.presentation} onChange={(value) => setForm({ ...form, presentation: value })} />
                  <label className="block text-sm font-bold text-brand-inkSoft">
                    Estado en tienda
                    <select className="input-brand mt-2" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
                      {productStatuses.map((status) => <option key={status} value={status}>{labelFrom(productStatusLabels, status)}</option>)}
                    </select>
                  </label>
                  <label className="flex min-h-[74px] items-center gap-3 rounded-2xl border border-brand-line bg-white px-4 py-3 text-sm font-bold text-brand-inkSoft">
                    <input type="checkbox" className="h-5 w-5 accent-brand-blue" checked={form.isFeatured} disabled={!form.isFeatured && !editingProduct?.isFeatured && featuredProductCount >= MAX_FEATURED_PRODUCTS} onChange={(event) => setForm({ ...form, isFeatured: event.target.checked })} />
                    Destacar en portada ({featuredProductCount}/{MAX_FEATURED_PRODUCTS})
                  </label>
                  <label className="flex min-h-[74px] items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
                    <input type="checkbox" className="h-5 w-5 accent-brand-blue" checked={form.isLimitedEdition} onChange={(event) => setForm({ ...form, isLimitedEdition: event.target.checked })} />
                    Edicion limitada
                  </label>

                  <Field label="Precio actual" value={form.price} onChange={(value) => setForm({ ...form, price: value })} type="number" required />
                  <Field label="Precio anterior" value={form.previousPrice} onChange={(value) => setForm({ ...form, previousPrice: value })} type="number" />
                  <Field label="Existencias disponibles" value={form.stock} onChange={(value) => setForm({ ...form, stock: value })} type="number" required />
                  <Field label="Numero de piezas" value={form.pieces} onChange={(value) => setForm({ ...form, pieces: value })} type="number" />
                  <Field label="Material" value={form.material} onChange={(value) => setForm({ ...form, material: value })} />
                  <Field label="Altura aproximada" value={form.altura} onChange={(value) => setForm({ ...form, altura: value })} />
                  <Field label="Escala / compatibilidad" value={form.escala} onChange={(value) => setForm({ ...form, escala: value })} />
                </div>

                <div className="mt-4 grid gap-4">
                  <label className="block text-sm font-bold text-brand-inkSoft">
                    Descripcion comercial
                    <textarea className="input-brand mt-2 min-h-28" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} required />
                  </label>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <button className="btn-primary" disabled={saving}><Save size={18} /> {saving ? 'Guardando...' : 'Guardar producto'}</button>
                  <button type="button" className="btn-light" onClick={closeProductForm}>Cancelar</button>
                </div>
              </form>
              </div>
            ) : null}

            <div className="grid gap-4">
              {filteredProducts.map((product) => {
                const available = (product.inventory?.stock ?? 0) - (product.inventory?.reserved ?? 0);
                const generalImages = (product.images?.filter((image) => !image.variantId) ?? []).sort((a, b) => a.sortOrder - b.sortOrder);
                const mainImage = generalImages.find((image) => image.isMain) ?? generalImages[0] ?? product.variants?.find((variant) => variant.images?.length)?.images?.[0];
                return (
                  <article key={product.id} className="card p-5">
                    <div className="grid gap-5 xl:grid-cols-[120px_minmax(240px,1fr)_minmax(0,620px)_150px] xl:items-start">
                      <div className="overflow-hidden rounded-3xl border border-brand-line bg-brand-paper2">
                        {mainImage ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={mainImage.url} alt={mainImage.alt ?? product.name} className="aspect-square h-full w-full object-cover" />
                        ) : (
                          <div className="grid aspect-square place-items-center text-brand-inkSoft/70"><ImageIcon size={34} /></div>
                        )}
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-full px-3 py-1 text-xs font-black ${product.status === 'ACTIVE' ? 'bg-brand-green/10 text-brand-green' : product.status === 'DRAFT' ? 'bg-amber-50 text-amber-700' : 'bg-brand-paper2 text-brand-inkSoft'}`}>
                            {labelFrom(productStatusLabels, product.status)}
                          </span>
                          <LimitedEditionBadge isLimitedEdition={product.isLimitedEdition} />
                          {product.isFeatured ? <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-black text-sky-700"><Star size={12} className="mr-1" /> Destacado</span> : null}
                        </div>
                        <h3 className="mt-3 text-xl font-black">{product.name}</h3>
                        <p className="mt-1 text-sm font-semibold text-brand-inkSoft">{product.sku} · {product.brand?.name} · {product.category?.name}</p>
                        <p className="mt-2 text-sm text-brand-inkSoft">{product.character ?? 'Sin personaje'} · {product.presentation ?? product.category?.name} · Reservado {product.inventory?.reserved ?? 0}</p>
                      </div>

                      <div className="grid min-w-0 gap-3 sm:grid-cols-2 2xl:grid-cols-4">
                        <label className="min-w-0 text-sm font-bold text-brand-inkSoft">
                          Categoria
                        <select
                          className="input-brand mt-2"
                          value={product.categoryId}
                          onChange={(event) => {
                            if (event.target.value !== product.categoryId) void quickUpdateProduct(product, { categoryId: event.target.value });
                          }}
                        >
                          {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                        </select>
                      </label>

                        <label className="min-w-0 text-sm font-bold text-brand-inkSoft">
                          Precio
                        <input
                          className="input-brand mt-2"
                          type="number"
                          defaultValue={Number(product.price)}
                          onBlur={(event) => {
                            const value = Number(event.target.value);
                            if (value !== Number(product.price)) void quickUpdateProduct(product, { price: value });
                          }}
                        />
                      </label>

                        <label className="min-w-0 text-sm font-bold text-brand-inkSoft">
                          Precio referencia
                        <input
                          className="input-brand mt-2"
                          type="number"
                          min="0"
                          placeholder="Sin referencia"
                          defaultValue={product.previousPrice ? Number(product.previousPrice) : ''}
                          onBlur={(event) => {
                            const rawValue = event.target.value.trim();
                            const currentValue = product.previousPrice == null ? null : Number(product.previousPrice);
                            const value = rawValue === '' ? null : Number(rawValue);
                            if (value !== currentValue) void quickUpdateProduct(product, { previousPrice: value });
                          }}
                        />
                      </label>

                        <label className="min-w-0 text-sm font-bold text-brand-inkSoft">
                          Existencias
                        <input
                          className="input-brand mt-2"
                          type="number"
                          defaultValue={product.inventory?.stock ?? 0}
                          onBlur={(event) => {
                            const value = Number(event.target.value);
                            if (value !== product.inventory?.stock) void quickUpdateProduct(product, { stock: value });
                          }}
                        />
                          <span className={`mt-2 block text-xs ${available <= 0 ? 'text-red-600' : available <= 3 ? 'text-amber-600' : 'text-brand-inkSoft/70'}`}>Disponible: {available}</span>
                        </label>
                      </div>

                      <div className="grid min-w-0 gap-2 content-start">
                        <StatusSelect value={product.status} options={productStatuses} labels={productStatusLabels} onChange={(status) => quickUpdateProduct(product, { status })} />
                        <button className={`inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border px-3 py-2 text-sm font-black disabled:cursor-not-allowed disabled:opacity-45 ${product.isFeatured ? 'border-sky-200 bg-sky-50 text-sky-700' : 'border-brand-line text-brand-inkSoft hover:border-sky-300 hover:text-sky-700'}`} onClick={() => quickUpdateProduct(product, { isFeatured: !product.isFeatured })} disabled={!product.isFeatured && featuredProductCount >= MAX_FEATURED_PRODUCTS} title={product.isFeatured ? 'Quitar de portada' : featuredProductCount >= MAX_FEATURED_PRODUCTS ? 'Limite de destacados alcanzado' : 'Destacar en portada'}>
                          <Star size={18} fill={product.isFeatured ? 'currentColor' : 'none'} />
                          {product.isFeatured ? 'En portada' : 'Destacar'}
                        </button>
                        <div className="grid grid-cols-2 gap-2">
                          <button className="grid min-h-11 place-items-center rounded-2xl border border-brand-line text-brand-inkSoft hover:border-brand-blue hover:text-brand-blue" onClick={() => startEdit(product)} title="Editar">
                            <Edit3 size={18} />
                          </button>
                          <button className="grid min-h-11 place-items-center rounded-2xl border border-red-100 text-red-600 hover:bg-red-50" onClick={() => deactivateProduct(product)} title="Desactivar">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 rounded-3xl border border-brand-line bg-white p-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <p className="text-sm font-black text-brand-ink">Colores e inventario por color</p>
                          <p className="mt-1 text-xs font-semibold text-brand-inkSoft">Cada color puede tener stock y foto propia. El cliente vera estos botones en la ficha del producto.</p>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-[1fr_86px_86px_auto]">
                          <input className="input-brand h-11" placeholder="Negro, Azul, Verde..." value={variantDrafts[product.id]?.colorName ?? ''} onChange={(event) => updateVariantDraft(product.id, { colorName: event.target.value })} />
                          <input className="h-11 w-full rounded-2xl border border-brand-line bg-white p-1" type="color" value={variantDrafts[product.id]?.colorHex ?? '#111827'} onChange={(event) => updateVariantDraft(product.id, { colorHex: event.target.value })} title="Color visual" />
                          <input className="input-brand h-11" type="number" min="0" placeholder="Stock" value={variantDrafts[product.id]?.stock ?? '0'} onChange={(event) => updateVariantDraft(product.id, { stock: event.target.value })} />
                          <button className="rounded-2xl bg-brand-dark px-4 py-2 text-sm font-black text-white" onClick={() => addProductVariant(product)}>
                            <Plus size={16} className="mr-1 inline" /> Agregar
                          </button>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3">
                        {product.variants?.map((variant) => {
                          const availableVariant = Math.max(0, variant.stock - variant.reserved);
                          const variantImages = [...(variant.images ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);
                          const variantImage = variantImages.find((image) => image.isMain) ?? variantImages[0];
                          const remainingImages = Math.max(0, 5 - variantImages.length);
                          return (
                            <div key={variant.id} className="grid gap-3 rounded-3xl border border-brand-line bg-brand-paper2 p-3 lg:grid-cols-[150px_1fr_120px_120px_190px] lg:items-center">
                              <div className="grid gap-2 lg:order-2 lg:col-span-5">
                                <div className="w-24 overflow-hidden rounded-2xl border border-brand-line bg-white sm:w-28">
                                {variantImage ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={variantImage.url} alt={`${product.name} ${variant.colorName}`} className="aspect-square w-full object-cover" />
                                ) : (
                                  <div className="grid aspect-square place-items-center text-brand-inkSoft/70"><ImageIcon size={22} /></div>
                                )}
                                </div>
                                {variantImages.length ? (
                                  <div className="flex gap-3 overflow-x-auto pb-2">
                                    {variantImages.slice(0, 5).map((image, imageIndex) => (
                                      <div key={image.id} className={`w-44 shrink-0 overflow-hidden rounded-2xl border bg-white transition ${image.isMain ? 'border-brand-blue shadow-glow' : 'border-brand-line'}`}>
                                        <div className="relative">
                                          {/* eslint-disable-next-line @next/next/no-img-element */}
                                          <img src={image.url} alt={image.alt ?? variant.colorName} className="aspect-square w-full object-cover" />
                                          {image.isMain ? <span className="absolute left-2 top-2 rounded-full bg-brand-blue px-2 py-1 text-[9px] font-black text-white">PRINCIPAL</span> : null}
                                        </div>
                                        <div className="grid gap-2 p-2 text-[10px] font-black">
                                          <button
                                            type="button"
                                            className={`flex h-9 items-center justify-between rounded-full px-2 transition ${image.isMain ? 'bg-brand-green/10 text-brand-green' : 'bg-brand-paper2 text-brand-inkSoft hover:bg-brand-blue/10 hover:text-brand-blue'}`}
                                            onClick={() => {
                                              if (!image.isMain) void setMainImage(product, image);
                                            }}
                                            disabled={imageSavingId === image.id}
                                            aria-pressed={image.isMain}
                                          >
                                            <span>Principal</span>
                                            <span className={`relative h-5 w-9 rounded-full transition ${image.isMain ? 'bg-brand-green' : 'bg-brand-inkSoft/30'}`}>
                                              <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition ${image.isMain ? 'left-4' : 'left-0.5'}`} />
                                            </span>
                                          </button>
                                          <div className="grid grid-cols-2 gap-1">
                                          <button className="rounded-xl bg-brand-paper2 px-2 py-1.5 text-brand-inkSoft disabled:text-brand-inkSoft/40" onClick={() => reorderProductImage(product, image, variantImages, -1)} disabled={imageIndex === 0}>Subir</button>
                                          <button className="rounded-xl bg-brand-paper2 px-2 py-1.5 text-brand-inkSoft disabled:text-brand-inkSoft/40" onClick={() => reorderProductImage(product, image, variantImages, 1)} disabled={imageIndex === variantImages.length - 1}>Bajar</button>
                                          </div>
                                          <label className="cursor-pointer rounded-xl border border-brand-line px-2 py-1.5 text-center text-brand-inkSoft">
                                            Reemplazar
                                            <input
                                              type="file"
                                              accept="image/jpeg,image/png,image/webp"
                                              className="hidden"
                                              disabled={imageSavingId === image.id}
                                              onChange={(event) => {
                                                void replaceProductImage(product, image.id, event.target.files?.[0]);
                                                event.currentTarget.value = '';
                                              }}
                                            />
                                          </label>
                                          <button className="rounded-xl border border-red-100 px-2 py-1.5 text-red-600" onClick={() => deleteProductImage(product, image.id)}>Eliminar</button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : null}
                              </div>
                              <label className="text-sm font-bold text-brand-inkSoft">
                                Nombre del color
                                <input className="input-brand mt-2" defaultValue={variant.colorName} onBlur={(event) => {
                                  const value = event.target.value.trim();
                                  if (value && value !== variant.colorName) void updateProductVariant(product, variant, { colorName: value });
                                }} />
                              </label>
                              <label className="text-sm font-bold text-brand-inkSoft">
                                Muestra
                                <input className="mt-2 h-11 w-full rounded-2xl border border-brand-line bg-white p-1" type="color" defaultValue={variant.colorHex} onBlur={(event) => {
                                  if (event.target.value !== variant.colorHex) void updateProductVariant(product, variant, { colorHex: event.target.value });
                                }} />
                              </label>
                              <label className="text-sm font-bold text-brand-inkSoft">
                                Stock
                                <input className="input-brand mt-2" type="number" min="0" defaultValue={variant.stock} onBlur={(event) => {
                                  const value = Number(event.target.value);
                                  if (value !== variant.stock) void updateProductVariant(product, variant, { stock: value });
                                }} />
                                <span className={`mt-2 block text-xs ${availableVariant <= 0 ? 'text-red-600' : availableVariant <= 3 ? 'text-amber-600' : 'text-brand-inkSoft/70'}`}>Disponible: {availableVariant} · Reservado: {variant.reserved}</span>
                              </label>
                              <div className="flex flex-wrap gap-2 lg:justify-end">
                                <label className={`inline-flex cursor-pointer items-center rounded-2xl px-3 py-2 text-xs font-black text-white ${remainingImages > 0 ? 'bg-brand-dark' : 'bg-brand-inkSoft/30'}`}>
                                  <Upload size={14} className="mr-1" /> Fotos {variantImages.length}/5
                                  <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" disabled={imageSavingId === variant.id || remainingImages <= 0} onChange={(event) => {
                                    void uploadProductImages(product, event.target.files, true, variant.id);
                                    event.currentTarget.value = '';
                                  }} />
                                </label>
                                <button className="rounded-2xl border border-red-100 px-3 py-2 text-xs font-black text-red-600" onClick={() => deleteProductVariant(product, variant)}>
                                  Eliminar
                                </button>
                              </div>
                            </div>
                          );
                        })}
                        {!product.variants?.length ? (
                          <div className="rounded-3xl border border-dashed border-brand-line bg-brand-paper2 p-5 text-center text-sm font-bold text-brand-inkSoft/70">
                            Sin colores configurados. Puedes agregar Negro, Azul, Verde, etc. con stock independiente.
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-5 rounded-3xl border border-brand-line bg-brand-paper2 p-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="text-sm font-black text-brand-ink">Imagenes del producto</p>
                          <p className="mt-1 text-xs font-semibold text-brand-inkSoft">La marcada como principal es la que aparece primero en tienda.</p>
                        </div>
                        <label className="inline-flex cursor-pointer items-center justify-center rounded-2xl bg-brand-dark px-4 py-3 text-sm font-black text-white">
                          <Upload size={16} className="mr-2" /> {imageSavingId === product.id ? 'Subiendo...' : 'Subir principal'}
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="hidden"
                            disabled={imageSavingId === product.id}
                            onChange={(event) => {
                              void uploadProductImages(product, event.target.files, true);
                              event.currentTarget.value = '';
                            }}
                          />
                        </label>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {generalImages.map((image, imageIndex) => (
                          <div key={image.id} className="overflow-hidden rounded-3xl border border-brand-line bg-white">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={image.url} alt={image.alt ?? product.name} className="aspect-square w-full object-cover" />
                            <div className="grid gap-2 p-3">
                              <button
                                type="button"
                                className={`flex h-11 items-center justify-between rounded-full px-3 text-xs font-black transition ${image.isMain ? 'bg-brand-green/10 text-brand-green' : 'bg-brand-paper2 text-brand-inkSoft hover:bg-brand-blue/10 hover:text-brand-blue'}`}
                                onClick={() => {
                                  if (!image.isMain) void setMainImage(product, image);
                                }}
                                disabled={imageSavingId === image.id}
                                aria-pressed={image.isMain}
                              >
                                <span>Principal</span>
                                <span className={`relative h-5 w-9 rounded-full transition ${image.isMain ? 'bg-brand-green' : 'bg-brand-inkSoft/30'}`}>
                                  <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition ${image.isMain ? 'left-4' : 'left-0.5'}`} />
                                </span>
                              </button>
                              <div className="grid grid-cols-2 gap-2">
                                <button className="rounded-2xl bg-brand-paper2 px-3 py-2 text-xs font-black text-brand-inkSoft disabled:text-brand-inkSoft/40" onClick={() => reorderProductImage(product, image, generalImages, -1)} disabled={imageIndex === 0 || imageSavingId === image.id}>
                                  Subir
                                </button>
                                <button className="rounded-2xl bg-brand-paper2 px-3 py-2 text-xs font-black text-brand-inkSoft disabled:text-brand-inkSoft/40" onClick={() => reorderProductImage(product, image, generalImages, 1)} disabled={imageIndex === generalImages.length - 1 || imageSavingId === image.id}>
                                  Bajar
                                </button>
                              </div>
                              <label className="cursor-pointer rounded-2xl border border-brand-line px-3 py-2 text-center text-xs font-black text-brand-inkSoft">
                                Reemplazar
                                <input
                                  type="file"
                                  accept="image/jpeg,image/png,image/webp"
                                  className="hidden"
                                  disabled={imageSavingId === image.id}
                                  onChange={(event) => {
                                    void replaceProductImage(product, image.id, event.target.files?.[0]);
                                    event.currentTarget.value = '';
                                  }}
                                />
                              </label>
                              <button className="rounded-2xl border border-red-100 px-3 py-2 text-xs font-black text-red-600" onClick={() => deleteProductImage(product, image.id)}>
                                Eliminar
                              </button>
                            </div>
                          </div>
                        ))}
                        {!generalImages.length ? <div className="rounded-3xl border border-dashed border-brand-line bg-white p-6 text-center text-sm font-bold text-brand-inkSoft/70">Sin imagenes generales</div> : null}
                      </div>
                    </div>
                  </article>
                );
              })}
              {!filteredProducts.length ? <div className="card p-8 text-center font-bold text-brand-inkSoft">No hay productos para mostrar.</div> : null}
            </div>
          </div>
        ) : null}

        {activeTab === 'inventory' ? (
          <a
            href="#inventario-top"
            className="fixed bottom-5 right-5 z-50 inline-flex items-center rounded-full bg-brand-dark px-4 py-3 text-xs font-black text-white shadow-glow transition hover:-translate-y-0.5 hover:bg-brand-blue"
          >
            <ArrowUp size={16} className="mr-2" /> Arriba
          </a>
        ) : null}

        {activeTab === 'analytics' ? (
          <div className="grid gap-5">
            <section className="card p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-black uppercase text-brand-blue">Analitica</p>
                  <h2 className="mt-1 text-2xl font-black">Actividad de los ultimos {analytics?.days ?? 30} dias</h2>
                  <p className="mt-2 text-sm text-brand-inkSoft">Eventos propios capturados desde la web, utiles aunque Google Analytics aun no tenga ID configurado.</p>
                </div>
                <button className="btn-light" onClick={() => loadBackoffice()}>Actualizar</button>
              </div>
            </section>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <article className="card p-5">
                <div className="inline-flex rounded-2xl bg-brand-blue/10 p-3 text-brand-blue"><BarChart3 size={22} /></div>
                <p className="mt-4 text-sm font-semibold text-brand-inkSoft">Eventos totales</p>
                <p className="mt-2 text-2xl font-black">{analytics?.total ?? 0}</p>
              </article>
              {(analytics?.keyEvents ?? []).map((entry) => (
                <article key={entry.event} className="card p-5">
                  <p className="text-xs font-black uppercase text-brand-blue">{entry.event}</p>
                  <p className="mt-3 text-2xl font-black">{entry.count}</p>
                  <p className="mt-1 text-xs font-semibold text-brand-inkSoft/70">Evento capturado</p>
                </article>
              ))}
            </div>

            <div className="grid gap-5 xl:grid-cols-[.85fr_1.15fr]">
              <section className="card p-6">
                <p className="text-sm font-black uppercase text-brand-blue">Productos vistos / accionados</p>
                <h2 className="mt-1 text-2xl font-black">Top productos</h2>
                <div className="mt-5 grid gap-3">
                  {(analytics?.topProducts ?? []).map((entry) => (
                    <div key={entry.productId ?? 'unknown'} className="rounded-2xl border border-brand-line bg-white p-4">
                      <p className="font-black text-brand-ink">{entry.product?.name ?? 'Producto no identificado'}</p>
                      <p className="mt-1 text-xs font-semibold text-brand-inkSoft/70">{entry.count} eventos</p>
                    </div>
                  ))}
                  {!analytics?.topProducts?.length ? <p className="rounded-2xl bg-brand-paper2 p-5 text-center text-sm font-bold text-brand-inkSoft">Aun no hay eventos de producto.</p> : null}
                </div>
              </section>

              <section className="card p-6">
                <p className="text-sm font-black uppercase text-brand-blue">Eventos recientes</p>
                <h2 className="mt-1 text-2xl font-black">Ultima actividad</h2>
                <div className="mt-5 grid gap-3">
                  {(analytics?.recent ?? []).map((event) => (
                    <div key={event.id} className="grid gap-2 rounded-2xl border border-brand-line bg-white p-4 sm:grid-cols-[1fr_auto] sm:items-center">
                      <div>
                        <p className="font-black text-brand-ink">{event.event}</p>
                        <p className="mt-1 break-all text-xs font-semibold text-brand-inkSoft">{event.path ?? 'Sin ruta'}</p>
                      </div>
                      <span className="rounded-full bg-brand-paper2 px-3 py-1 text-xs font-black text-brand-inkSoft">{new Date(event.createdAt).toLocaleString('es-CO')}</span>
                    </div>
                  ))}
                  {!analytics?.recent?.length ? <p className="rounded-2xl bg-brand-paper2 p-5 text-center text-sm font-bold text-brand-inkSoft">Todavia no hay eventos registrados.</p> : null}
                </div>
              </section>
            </div>
          </div>
        ) : null}

        {activeTab === 'reviews' ? (
          <div className="grid gap-4">
            <section className="card p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-black uppercase text-brand-blue">Comentarios</p>
                  <h2 className="mt-1 text-2xl font-black">Resenas de producto</h2>
                  <p className="mt-2 text-sm text-brand-inkSoft">Lo nuevo entra pendiente. Aprueba solo comentarios reales y utiles para el comprador.</p>
                </div>
                <span className="rounded-full bg-amber-50 px-4 py-2 text-xs font-black text-amber-700">{pendingReviewCount} pendientes</span>
              </div>
            </section>

            {reviews.map((review) => (
              <article key={review.id} className="card p-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-black ${review.status === 'APPROVED' ? 'bg-brand-green/10 text-brand-green' : review.status === 'REJECTED' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>{review.status}</span>
                      <span className="rounded-full bg-brand-paper2 px-3 py-1 text-xs font-black text-brand-inkSoft">{review.rating}/5</span>
                      <span className="rounded-full bg-brand-blue/10 px-3 py-1 text-xs font-black text-brand-blue">{review.product?.name ?? 'Producto'}</span>
                    </div>
                    <h2 className="mt-3 text-xl font-black">{review.title || `Comentario de ${review.name}`}</h2>
                    <p className="mt-1 text-sm font-semibold text-brand-inkSoft">{review.name}{review.city ? ` · ${review.city}` : ''} · {new Date(review.createdAt).toLocaleString('es-CO')}</p>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-brand-inkSoft">{review.comment}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 xl:justify-end">
                    <button className="rounded-2xl bg-brand-green/10 px-4 py-3 text-sm font-black text-brand-green" onClick={() => updateReviewStatus(review.id, 'APPROVED')}>Aprobar</button>
                    <button className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-black text-amber-700" onClick={() => updateReviewStatus(review.id, 'PENDING')}>Pendiente</button>
                    <button className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-black text-red-700" onClick={() => updateReviewStatus(review.id, 'REJECTED')}>Rechazar</button>
                    <button className="rounded-2xl border border-red-100 p-3 text-red-600" onClick={() => deleteReview(review)} title="Eliminar comentario"><Trash2 size={18} /></button>
                  </div>
                </div>
              </article>
            ))}
            {!reviews.length ? <div className="card p-8 text-center font-bold text-brand-inkSoft">No hay comentarios registrados.</div> : null}
          </div>
        ) : null}

        {activeTab === 'orders' ? (
          <div className="grid gap-4">
            {orders.map((order) => {
              const customerName = `${order.shippingAddress?.firstName ?? order.user?.firstName ?? ''} ${order.shippingAddress?.lastName ?? order.user?.lastName ?? ''}`.trim() || 'Cliente';
              return (
              <article key={order.id} className="card p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xs font-black uppercase text-brand-blue">{order.orderNumber}</p>
                      <span className="text-xs font-semibold text-brand-inkSoft/70">{new Date(order.createdAt).toLocaleString('es-CO')}</span>
                    </div>
                    <h2 className="mt-1 text-xl font-black">{formatCurrency(order.grandTotal)}</h2>

                    <div className="mt-3 grid gap-1 text-sm">
                      <p className="inline-flex items-center gap-2 font-black text-brand-ink"><User size={14} className="text-brand-blue" /> {customerName}</p>
                      {order.user?.email ? <p className="inline-flex items-center gap-2 text-brand-inkSoft"><Mail size={14} className="text-brand-inkSoft/70" /> {order.user.email}</p> : null}
                      {order.shippingAddress?.phone ? <p className="inline-flex items-center gap-2 text-brand-inkSoft"><Phone size={14} className="text-brand-inkSoft/70" /> {order.shippingAddress.phone}</p> : null}
                      {order.shippingAddress?.document ? <p className="inline-flex items-center gap-2 text-brand-inkSoft"><FileText size={14} className="text-brand-inkSoft/70" /> Doc. {order.shippingAddress.document}</p> : null}
                    </div>

                    {order.shippingAddress ? (
                      <p className="mt-2 inline-flex items-start gap-2 text-sm text-brand-inkSoft">
                        <MapPin size={14} className="mt-0.5 shrink-0 text-brand-inkSoft/70" />
                        <span>{order.shippingAddress.addressLine1}{order.shippingAddress.addressLine2 ? `, ${order.shippingAddress.addressLine2}` : ''}, {order.shippingAddress.city}, {order.shippingAddress.department}</span>
                      </p>
                    ) : null}

                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full bg-brand-paper2 px-3 py-1 text-xs font-black text-brand-inkSoft">{labelFrom(paymentMethodLabels, order.paymentMethod ?? order.payments?.[0]?.method, 'Metodo pendiente')}</span>
                      <span className={`rounded-full px-3 py-1 text-xs font-black ${order.payments?.[0]?.status === 'APPROVED' ? 'bg-brand-green/10 text-brand-green' : order.payments?.[0]?.status === 'DECLINED' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>Pago {labelFrom(paymentStatusLabels, order.payments?.[0]?.status, 'pendiente')}</span>
                      {order.coupon ? <span className="inline-flex items-center gap-1 rounded-full bg-brand-green/10 px-3 py-1 text-xs font-black text-brand-green"><Tag size={12} /> {order.coupon.code}</span> : null}
                    </div>

                    <details className="mt-4">
                      <summary className="cursor-pointer text-xs font-black text-brand-blue">Ver {order.items?.length ?? 0} producto(s) y detalle de totales</summary>
                      <div className="mt-3 grid gap-2 rounded-2xl bg-brand-paper2 p-4">
                        {order.items?.map((item) => (
                          <div key={item.id} className="flex items-center justify-between gap-3 text-sm">
                            <span className="min-w-0 truncate font-semibold text-brand-inkSoft">{item.quantity}x {item.nameSnapshot}{item.variantSnapshot ? ` (${item.variantSnapshot})` : ''}</span>
                            <span className="shrink-0 font-black text-brand-ink">{formatCurrency(item.totalPrice ?? Number(item.unitPrice ?? 0) * item.quantity)}</span>
                          </div>
                        ))}
                        <div className="mt-2 grid gap-1 border-t border-brand-line pt-2 text-xs font-semibold text-brand-inkSoft">
                          {order.subtotal !== undefined ? <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(order.subtotal)}</span></div> : null}
                          {Number(order.discountTotal ?? 0) > 0 ? <div className="flex justify-between text-brand-green"><span>Descuento{order.coupon ? ` (${order.coupon.code})` : ''}</span><span>-{formatCurrency(order.discountTotal ?? 0)}</span></div> : null}
                          {order.shippingTotal !== undefined ? <div className="flex justify-between"><span>Envio</span><span>{Number(order.shippingTotal) === 0 ? 'Gratis' : formatCurrency(order.shippingTotal)}</span></div> : null}
                          <div className="flex justify-between text-sm font-black text-brand-ink"><span>Total</span><span>{formatCurrency(order.grandTotal)}</span></div>
                        </div>
                        {order.notes ? <p className="mt-2 text-xs italic text-brand-inkSoft">Notas: {order.notes}</p> : null}
                      </div>
                    </details>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <StatusSelect value={order.status} options={orderStatuses} labels={orderStatusLabels} onChange={(status) => updateOrderStatus(order.id, status)} />
                    <button type="button" onClick={() => deleteOrder(order)} className="rounded-2xl border border-red-100 p-3 text-red-600 transition hover:bg-red-50" title="Eliminar pedido" aria-label="Eliminar pedido">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </article>
              );
            })}
            {!orders.length ? <div className="card p-8 text-center font-bold text-brand-inkSoft">No hay pedidos registrados.</div> : null}
          </div>
        ) : null}

      </section>
    </main>
  );
}
