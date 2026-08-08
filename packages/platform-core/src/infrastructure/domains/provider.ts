import type {
  Domain,
  DomainAvailability,
  RegisterDomainParams,
  RenewDomainParams,
  TransferDomainParams,
  UpdateDomainParams,
} from "../core/types";

/**
 * DomainProvider — provider-agnostic domain operations.
 * UX always says “DigitalGate Domains”; adapters speak Dreamscape/etc. privately.
 */
export interface DomainProvider {
  readonly id: string;
  readonly displayName: string;

  /** Availability search (Dreamscape: GET /domains/availability) */
  search(query: string | string[]): Promise<DomainAvailability[]>;

  register(params: RegisterDomainParams): Promise<Domain>;

  renew(domainId: string, params?: RenewDomainParams): Promise<Domain>;

  transfer(params: TransferDomainParams): Promise<Domain>;

  get(domainId: string): Promise<Domain | null>;

  update(domainId: string, params: UpdateDomainParams): Promise<Domain>;

  list(providerCustomerId?: string): Promise<Domain[]>;
}
