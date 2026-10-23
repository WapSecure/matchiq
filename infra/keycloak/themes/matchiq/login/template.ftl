<#--
  MatchIQ page frame for every login-flow page. Derived from keycloak.v2's
  template.ftl: the nested sections, alert, username echo and scripts are kept
  so parent templates (login, error, info, expired pages) render unchanged.
-->
<#import "footer.ftl" as loginFooter>
<#macro username>
  <div class="mq-attempted">
    <span class="mq-attempted-label">${msg("mqSigningInAs")}</span>
    <span class="mq-attempted-row">
      <input id="kc-attempted-username" value="${auth.attemptedUsername}" readonly aria-label="${msg("mqSigningInAs")}">
      <a id="reset-login" class="mq-text-link" href="${url.loginRestartFlowUrl}">${msg("restartLoginTooltip")}</a>
    </span>
  </div>
</#macro>

<#function appUrl>
  <#if client?? && client.baseUrl?has_content><#return client.baseUrl></#if>
  <#return properties.matchiqAppUrl>
</#function>

<#macro registrationLayout bodyClass="" displayInfo=false displayMessage=true displayRequiredFields=false>
<#assign isSignInPage = ["login", "login-username", "login-password"]?seq_contains(pageId)>
<!DOCTYPE html>
<html lang="${lang}"<#if realm.internationalizationEnabled> dir="${(locale.rtl)?then('rtl','ltr')}"</#if>>
<head>
  <meta charset="utf-8">
  <meta name="color-scheme" content="light dark">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <title><#nested "header"> · ${msg("mqProductName")}</title>
  <link rel="icon" href="${url.resourcesPath}/img/favicon.ico">
  <link rel="preload" href="${url.resourcesPath}/fonts/Geist-Variable.woff2" as="font" type="font/woff2" crossorigin>
  <#if properties.styles?has_content>
    <#list properties.styles?split(' ') as style>
      <link href="${url.resourcesPath}/${style}" rel="stylesheet">
    </#list>
  </#if>
  <script type="importmap">
    {
      "imports": {
        "rfc4648": "${url.resourcesCommonPath}/vendor/rfc4648/rfc4648.js"
      }
    }
  </script>
  <#if scripts??>
    <#list scripts as script>
      <script src="${script}" type="text/javascript"></script>
    </#list>
  </#if>
  <script type="module" src="${url.resourcesPath}/js/passwordVisibility.js"></script>
  <script type="module">
    <#outputformat "JavaScript">
    import { startSessionPolling } from ${(url.resourcesPath + "/js/authChecker.js")?c};
    startSessionPolling(${url.ssoLoginInOtherTabsUrl?c});
    </#outputformat>
  </script>
  <script type="module">
    document.addEventListener("click", (event) => {
      const link = event.target.closest("a[data-once-link]");
      if (!link) return;
      if (link.getAttribute("aria-disabled") === "true") {
        event.preventDefault();
        return;
      }
      link.setAttribute("role", "link");
      link.setAttribute("aria-disabled", "true");
    });
  </script>
  <#if authenticationSession??>
    <script type="module">
      <#outputformat "JavaScript">
      import { checkAuthSession } from ${(url.resourcesPath + "/js/authChecker.js")?c};
      checkAuthSession(${authenticationSession.authSessionIdHash?c});
      </#outputformat>
    </script>
  </#if>
</head>

<body class="mq-body ${bodyClass}" data-page-id="login-${pageId}">
  <a class="mq-skip" href="#mq-main">${msg("mqSkipToContent")}</a>
  <div role="note" class="mq-notice">
    <div class="mq-container mq-notice-row">
      <span class="mq-badge"><span class="mq-badge-dot" aria-hidden="true"></span>${msg("mqSyntheticLabel")}</span>
      <p class="mq-notice-text">${msg("mqSyntheticText")}</p>
    </div>
  </div>
  <header class="mq-header">
    <div class="mq-container mq-header-row">
      <a id="mq-back" class="mq-back" href="${appUrl()}">
        <span class="mq-icon mq-icon-back" aria-hidden="true"></span>${msg("mqBackToApp")}
      </a>
    </div>
  </header>

  <main id="mq-main" class="mq-main">
    <div class="mq-card">
      <div class="mq-brand" aria-hidden="true">
        <span class="mq-logo-tile"><span class="mq-icon mq-icon-logo"></span></span>
        <span class="mq-wordmark">${msg("mqProductName")}</span>
      </div>
      <h1 id="kc-page-title" class="mq-title"><#nested "header"></h1>
      <#if isSignInPage>
        <p class="mq-lead">${msg("mqLoginLead")}</p>
      </#if>

      <#if auth?has_content && auth.showUsername() && !auth.showResetCredentials()>
        <#nested "show-username">
        <@username />
      </#if>

      <#if displayRequiredFields>
        <p class="mq-required-note"><span aria-hidden="true">*</span> ${msg("requiredFields")}</p>
      </#if>

      <#if displayMessage && message?has_content && (message.type != 'warning' || !isAppInitiatedAction??)>
        <div class="mq-alert mq-alert-${message.type}" role="<#if message.type = 'error'>alert<#else>status</#if>">
          <span class="mq-icon mq-icon-${(message.type = 'success')?then('check', (message.type = 'info')?then('info', 'alert'))}" aria-hidden="true"></span>
          <span class="kc-feedback-text">${kcSanitize(message.summary)?no_esc}</span>
        </div>
      </#if>

      <#nested "form">

      <#if auth?has_content && auth.showTryAnotherWayLink()>
        <form id="kc-select-try-another-way-form" action="${url.loginAction}" method="post" novalidate="novalidate">
          <input type="hidden" name="tryAnotherWay" value="on"/>
          <button id="try-another-way" type="submit" class="pf-v5-c-button pf-m-secondary mq-block mq-gap-top">${msg("doTryAnotherWay")}</button>
        </form>
      </#if>

      <#if switchOrganizationEnabled?? && switchOrganizationEnabled>
        <form id="kc-switch-organization-form" action="${url.loginAction}" method="post" novalidate="novalidate">
          <input type="hidden" name="switchOrganization" value="true"/>
          <button id="switch-organization" type="submit" class="pf-v5-c-button pf-m-secondary mq-block mq-gap-top">${msg("doSwitchOrganization")}</button>
        </form>
      </#if>

      <#nested "socialProviders">

      <#if displayInfo>
        <div id="kc-info" class="mq-info"><#nested "info"></div>
      </#if>
      <@loginFooter.content/>
    </div>
    <#if isSignInPage>
      <p class="mq-footnote">${msg("mqPasswordNote")}</p>
    </#if>
  </main>
</body>
</html>
</#macro>
