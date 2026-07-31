import { companyConfig } from '../../react-app/src/config/company.js';

export const publicationConfig = Object.freeze({
  softwareId: companyConfig.software.softwareId,
  licenseId: companyConfig.license.licenseId,
  projectId: companyConfig.ownership.projectId,
  owner: companyConfig.ownership.owner,
  developer: companyConfig.ownership.developer,
  licensedTo: companyConfig.license.licensedTo
});
